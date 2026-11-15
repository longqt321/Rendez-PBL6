import { Hono } from "hono"
import { z } from "zod"
import type { AppEnv } from "../app"
import { EVENT_TO_KIND } from "../lib/interaction-weights"
import { recordEvent } from "../lib/interaction-events"
import { prisma } from "../lib/prisma"
import { rateLimit } from "../lib/rate-limit"
import { getViewer } from "../lib/session"

/**
 * Thu thập sự kiện tương tác (P0 — hạ tầng đo lường).
 *
 * FE gửi batch (tối đa 20 event/request, gọi mỗi 5 giây khi có event mới).
 * Endpoint **không** trả lỗi khi một event hỏng: mục tiêu là không bao giờ
 * làm hỏng trải nghiệm người dùng vì telemetry. Response luôn 202 kèm số
 * event đã nhận/đã ghi.
 *
 * Dedupe 5 phút ở tầng ứng dụng (in-memory Set) — bảng partition theo tháng
 * không thể có UNIQUE constraint chứa bucket thời gian.
 */

const eventSchema = z.object({
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

const DEDUPE_TTL_MS = 5 * 60 * 1000
const seen = new Map<string, number>()

function dedupeKey(actor: string, e: z.infer<typeof eventSchema>): string {
  return `${actor}|${e.eventType}|${e.placeId ?? ""}|${e.postId ?? ""}`
}

function pruneSeen(now: number): void {
  if (seen.size < 5000) return
  for (const [key, at] of seen) {
    if (now - at > DEDUPE_TTL_MS) seen.delete(key)
  }
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
      // violation và event bị bỏ âm thầm. Kiểm tồn tại một lần cho cả batch
      // (chỉ cần tồn tại, không cần published — event cho bản nháp vẫn hợp lệ).
      const placeIds = [
        ...new Set(
          parsed.data.events
            .map((event) => event.placeId)
            .filter((id): id is string => Boolean(id)),
        ),
      ]
      if (placeIds.length > 0) {
        const found = await prisma.place.findMany({
          where: { id: { in: placeIds } },
          select: { id: true },
        })
        if (found.length !== placeIds.length) {
          return c.json({ accepted: 0, recorded: 0, error: "placeId không tồn tại" }, 400)
        }
      }

      const now = Date.now()
      pruneSeen(now)

      let recorded = 0
      for (const event of parsed.data.events) {
        // Event ngoài taxonomy: đếm là "accepted" nhưng không ghi — FE có thể
        // gửi event mới trước khi BE cập nhật taxonomy.
        if (!EVENT_TO_KIND[event.eventType]) continue

        const actor = viewer?.id ?? event.anonId
        if (!actor) continue

        const key = dedupeKey(actor, event)
        const last = seen.get(key)
        if (last !== undefined && now - last < DEDUPE_TTL_MS) continue

        const ok = await recordEvent({
          eventType: event.eventType,
          userId: viewer?.id ?? null,
          anonId: viewer ? null : (event.anonId ?? null),
          placeId: event.placeId ?? null,
          postId: event.postId ?? null,
          query: event.query ?? null,
          context: event.context ?? {},
          sessionId: event.sessionId ?? null,
        })
        // Đánh dấu dedupe + đếm CHỈ khi ghi thành công thật (recordEvent trả
        // false khi DB lỗi) — không báo "recorded" sai.
        if (ok) {
          seen.set(key, now)
          recorded += 1
        }
      }

      return c.json({ accepted: parsed.data.events.length, recorded }, 202)
    },
  )

  return router
}
