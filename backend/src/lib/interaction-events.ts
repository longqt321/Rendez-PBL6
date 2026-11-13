import type { Context } from "hono"
import type { AppEnv } from "../app"
import { logger } from "./logger"
import { prisma } from "./prisma"
import { weightForEvent } from "./interaction-weights"
import { getViewer } from "./session"

/**
 * Ghi một sự kiện tương tác vào `interaction_events` (P0 — hạ tầng đo lường).
 *
 * Nguyên tắc:
 * - **Không bao giờ làm hỏng request chính**: mọi lỗi chỉ ghi log rồi bỏ qua
 *   (cùng tinh thần `enqueuePlaceDetect` — bài đã lưu thì cron xử lý lại).
 * - Event không thuộc taxonomy (`weightForEvent` trả null) bị bỏ, không ghi
 *   trọng số đoán mò.
 * - `place_id`/`post_id` là FK thật; id không tồn tại thì bỏ event thay vì để
 *   Postgres ném lỗi FK (client có thể gửi id cũ đã bị xoá).
 *
 * Bảng là partitioned (theo tháng) — dùng raw insert để không phụ thuộc model
 * Prisma với composite PK `(id, created_at)`.
 */
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

export async function recordEvent(input: RecordEventInput): Promise<boolean> {
  const weight = weightForEvent(input.eventType)
  if (weight === null) {
    logger.warn({ eventType: input.eventType }, "event không thuộc taxonomy — bỏ qua")
    return false
  }
  if (!input.userId && !input.anonId) return false

  try {
    await prisma.$executeRaw`
      INSERT INTO interaction_events
        (user_id, anon_id, event_type, place_id, post_id, query, weight, context, session_id)
      VALUES (
        ${input.userId ?? null}::uuid,
        ${input.anonId ?? null},
        ${input.eventType},
        ${input.placeId ?? null},
        ${input.postId ?? null}::uuid,
        ${input.query ?? null},
        ${weight},
        ${JSON.stringify(input.context ?? {})}::jsonb,
        ${input.sessionId ?? null}
      )
    `
    return true
  } catch (error) {
    logger.warn({ err: error, eventType: input.eventType }, "không ghi được interaction_event")
    return false
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
