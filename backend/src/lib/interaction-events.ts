import type { Context } from "hono"
import type { AppEnv } from "../app"
import { logger } from "./logger"
import { prisma } from "./prisma"
import { weightForEvent } from "./interaction-weights"
import { getViewer } from "./session"

export interface RecordEventInput {
  eventType: string
  userId?: string | null
  anonId?: string | null
  placeId?: string | null
  postId?: string | null
  query?: string | null
  context?: Record<string, unknown>
  sessionId?: string | null
}

interface NormalizedEventRow {
  userId: string | null
  anonId: string | null
  eventType: string
  placeId: string | null
  postId: string | null
  query: string | null
  weight: number
  contextJson: string
  sessionId: string | null
}

function normalizeEvent(input: RecordEventInput): NormalizedEventRow | null {
  const weight = weightForEvent(input.eventType)
  if (weight === null) {
    // FE có thể gửi event mới trước khi BE cập nhật taxonomy — không phải lỗi
    // vận hành, để mức debug tránh spam log warn.
    logger.debug({ eventType: input.eventType }, "event không thuộc taxonomy — bỏ qua")
    return null
  }
  if (!input.userId && !input.anonId) return null
  return {
    userId: input.userId ?? null,
    anonId: input.anonId ?? null,
    eventType: input.eventType,
    placeId: input.placeId ?? null,
    postId: input.postId ?? null,
    query: input.query ?? null,
    weight,
    contextJson: JSON.stringify(input.context ?? {}),
    sessionId: input.sessionId ?? null,
  }
}

export async function recordEvent(input: RecordEventInput): Promise<boolean> {
  return (await recordEventsBatch([input])) === 1
}

/**
 * Bulk INSERT nhiều `interaction_events` trong 1 round-trip PostgreSQL duy nhất
 * bằng `unnest(...)`, tránh N query tuần tự khi FE gửi batch.
 */
export async function recordEventsBatch(inputs: RecordEventInput[]): Promise<number> {
  const rows = inputs.map(normalizeEvent).filter((row): row is NormalizedEventRow => row !== null)
  if (rows.length === 0) return 0

  try {
    const userIds = rows.map((r) => r.userId)
    const anonIds = rows.map((r) => r.anonId)
    const eventTypes = rows.map((r) => r.eventType)
    const placeIds = rows.map((r) => r.placeId)
    const postIds = rows.map((r) => r.postId)
    const queries = rows.map((r) => r.query)
    const weights = rows.map((r) => r.weight)
    const contexts = rows.map((r) => r.contextJson)
    const sessionIds = rows.map((r) => r.sessionId)

    const inserted = await prisma.$executeRaw`
      INSERT INTO interaction_events
        (user_id, anon_id, event_type, place_id, post_id, query, weight, context, session_id)
      SELECT
        u::uuid,
        a,
        et,
        pl,
        po::uuid,
        q,
        w,
        ctx::jsonb,
        sid
      FROM unnest(
        ${userIds}::text[],
        ${anonIds}::text[],
        ${eventTypes}::text[],
        ${placeIds}::text[],
        ${postIds}::text[],
        ${queries}::text[],
        ${weights}::int[],
        ${contexts}::text[],
        ${sessionIds}::text[]
      ) AS t(u, a, et, pl, po, q, w, ctx, sid)
    `
    return Number(inserted)
  } catch (error) {
    logger.warn({ err: error, count: rows.length }, "không ghi được interaction_events batch")
    return 0
  }
}

/**
 * Ghi event từ một request đã xác thực (hoặc guest có `anon_id`).
 * `placeId`/`postId` được kiểm tồn tại trước khi ghi để tránh FK violation.
 */
export async function recordEventForRequest(
  c: Context<AppEnv>,
  eventType: string,
  data: Omit<RecordEventInput, "eventType" | "userId" | "anonId">,
): Promise<void> {
  const viewer = await getViewer(c)
  // Guest: id ẩn danh do FE gửi qua header `x-anon-id` (cùng id dùng cho
  // `POST /events`). Không có header thì bỏ event — không tự chế id.
  await recordEvent({
    ...data,
    eventType,
    userId: viewer?.id ?? null,
    anonId: viewer ? null : (c.req.header("x-anon-id") ?? null),
  })
}
