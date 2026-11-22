import { Hono } from "hono"
import { LRUCache } from "lru-cache"
import { z } from "zod"
import type { AppEnv } from "../app"
import { EVENT_TO_KIND } from "../lib/interaction-weights"
import { recordEventsBatch, type RecordEventInput } from "../lib/interaction-events"
import { createTtlCache } from "../lib/http-cache"
import { logger } from "../lib/logger"
import { prisma } from "../lib/prisma"
import { rateLimit } from "../lib/rate-limit"
import { getRedis } from "../lib/redis"
import { recordRedisTiming } from "../lib/request-context"
import { getViewer } from "../lib/session"

/**
 * Thu thập sự kiện tương tác (P0 — hạ tầng đo lường).
 *
 * FE gửi batch (tối đa 20 event/request, gọi mỗi 5 giây khi có event mới).
 * Endpoint **không** trả lỗi khi một event hỏng: mục tiêu là không bao giờ
 * làm hỏng trải nghiệm người dùng vì telemetry. Response luôn 202 kèm số
 * event đã nhận/đã ghi.
 *
 * Dedupe 5 phút qua Redis `SET NX EX 300` (fallback LRUCache khi không có
 * Redis) và bulk INSERT 1 query duy nhất xuống `interaction_events`.
 */

const eventSchema = z.object({
  eventId: z.string().uuid().optional(),
  eventType: z.string().min(1).max(64),
  placeId: z.string().min(1).max(128).optional(),
  postId: z.string().uuid().optional(),
  query: z.string().max(200).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  sessionId: z.string().max(64).optional(),

  anonId: z.string().min(8).max(64).optional(),
})

const batchSchema = z.object({
  events: z.array(eventSchema).min(1).max(20),
})

const DEDUPE_TTL_SECONDS = 5 * 60
const DEDUPE_TTL_MS = DEDUPE_TTL_SECONDS * 1000
const seen = new LRUCache<string, true>({
  max: 10_000,
  ttl: DEDUPE_TTL_MS,
})

const validPlaceCache = createTtlCache<boolean>({
  ttlMs: 300_000,
  maxEntries: 1_000,
  namespace: "valid-place",
})

function dedupeKey(actor: string, e: z.infer<typeof eventSchema>): string {
  if (e.eventId) return `id:${actor}:${e.eventId}`
  return `${actor}|${e.eventType}|${e.placeId ?? ""}|${e.postId ?? ""}`
}

async function claimDedupeKeys(keys: string[]): Promise<boolean[]> {
  if (keys.length === 0) return []
  const redis = getRedis()
  if (redis) {
    const startedAt = performance.now()
    try {
      const results = await Promise.all(
        keys.map((key) =>
          redis.set(`dedupe:evt:${key}`, "1", "NX", "EX", String(DEDUPE_TTL_SECONDS)),
        ),
      )
      return results.map((res) => res === "OK")
    } catch (err) {
      logger.debug({ err }, "Redis dedupe events lỗi — fallback LRUCache")
    } finally {
      recordRedisTiming(performance.now() - startedAt)
    }
  }

  return keys.map((key) => {
    if (seen.has(key)) return false
    seen.set(key, true)
    return true
  })
}

export function createEventsRouter() {
  const router = new Hono<AppEnv>()

  router.post(
    "/events",
    rateLimit({ scope: "events", limit: 120, windowSeconds: 60 }),
    async (c) => {
      const viewer = await getViewer(c)
      const raw = await c.req.json().catch(() => null)
      const parsed = batchSchema.safeParse(raw)
      if (!parsed.success) {
        return c.json({ accepted: 0, recorded: 0, error: "payload không hợp lệ" }, 400)
      }

      // `interaction_events.place_id` là FK tới `places(id)` — id rác sẽ làm FK
      // violation và event bị bỏ âm thầm. Kiểm tồn tại một lần cho cả batch.
      const placeIds = [
        ...new Set(
          parsed.data.events
            .map((event) => event.placeId)
            .filter((id): id is string => Boolean(id)),
        ),
      ]
      if (placeIds.length > 0) {
        const checks = await Promise.all(
          placeIds.map((id) =>
            validPlaceCache.get(id, async () => {
              const row = await prisma.place.findUnique({ where: { id }, select: { id: true } })
              return Boolean(row)
            }),
          ),
        )
        if (checks.some((exists) => !exists)) {
          return c.json({ accepted: 0, recorded: 0, error: "placeId không tồn tại" }, 400)
        }
      }

      const candidates: { key: string; input: RecordEventInput }[] = []
      const batchSeen = new Set<string>()
      for (const event of parsed.data.events) {
        if (!EVENT_TO_KIND[event.eventType]) continue
        const actor = viewer?.id ?? event.anonId
        if (!actor) continue

        const key = dedupeKey(actor, event)
        if (batchSeen.has(key)) continue
        batchSeen.add(key)

        candidates.push({
          key,
          input: {
            eventType: event.eventType,
            userId: viewer?.id ?? null,
            anonId: viewer ? null : (event.anonId ?? null),
            placeId: event.placeId ?? null,
            postId: event.postId ?? null,
            query: event.query ?? null,
            context: event.context ?? {},
            sessionId: event.sessionId ?? null,
          },
        })
      }

      const claimed = await claimDedupeKeys(candidates.map((item) => item.key))
      const toInsert = candidates.filter((_, idx) => claimed[idx]).map((item) => item.input)
      const recorded = await recordEventsBatch(toInsert)

      return c.json({ accepted: parsed.data.events.length, recorded }, 202)
    },
  )

  return router
}
