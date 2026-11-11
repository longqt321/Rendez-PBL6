import { createHash } from "node:crypto"
import { createMiddleware } from "hono/factory"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import type { AppEnv } from "../app"
import { ApiError } from "./errors"
import { prisma } from "./prisma"

/**
 * Idempotency cho mutation quan trọng (K2).
 *
 * Theo IETF draft `Idempotency-Key` (và cách Stripe làm):
 * - Lần đầu: chèn hàng `pending` (nguyên tử bằng `ON CONFLICT DO NOTHING`),
 *   chạy handler, lưu response 2xx để replay.
 * - Cùng key + cùng payload khi hàng `completed` → trả lại đúng status/body cũ,
 *   kèm header `Idempotency-Replayed: true`.
 * - Cùng key nhưng payload khác → 422 (client lỗi, không phải server).
 * - Cùng key khi request trước còn đang xử lý (`pending`) → 409.
 * - Response 4xx ĐƯỢC lưu (kết quả tất định, key gắn với payload — giống
 *   Stripe/IETF); response 5xx KHÔNG lưu để client retry được.
 *
 * Header là tuỳ chọn — thiếu thì middleware bỏ qua, route chạy như cũ (không
 * phá client cũ/test hiện có). Phải đặt SAU `requireAuth` vì khoá theo user.
 */

/** TTL 24 giờ — đủ dài cho retry của client, đủ ngắn để bảng không phình. */
const TTL_MS = 24 * 60 * 60 * 1000

/** Giới hạn độ dài key (UUID là 36; cho phép tới 64 cho client khác). */
const MAX_KEY_LENGTH = 64

function hashBody(body: string): string {
  return createHash("sha256").update(body).digest("hex")
}

export function idempotency() {
  return createMiddleware<AppEnv>(async (c, next) => {
    const key = c.req.header("idempotency-key")
    if (!key) {
      await next()
      return
    }
    if (key.length > MAX_KEY_LENGTH) {
      throw new ApiError(400, "Idempotency-Key quá dài")
    }

    const userId = c.get("userId")
    if (!userId) throw new ApiError(401, "Chưa đăng nhập")

    // Đọc bản sao để handler vẫn đọc được body (Hono cache body theo request).
    const body = await c.req.raw.clone().text()
    const requestHash = hashBody(body)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + TTL_MS)

    // Dọn hàng hết hạn — bảng nhỏ, xoá theo index mỗi lần ghi là đủ.
    await prisma.idempotencyKey.deleteMany({ where: { expiresAt: { lt: now } } })

    const claimed = await prisma.$queryRaw<{ key: string }[]>`
      INSERT INTO idempotency_keys ("key", "user_id", "request_hash", "status", "expires_at")
      VALUES (${key}, ${userId}::uuid, ${requestHash}, 'pending', ${expiresAt})
      ON CONFLICT ("key", "user_id") DO NOTHING
      RETURNING "key"
    `

    if (claimed.length === 0) {
      const existing = await prisma.idempotencyKey.findUnique({
        where: { key_userId: { key, userId } },
      })
      // Hàng vừa bị dọn giữa hai bước — coi như đang xử lý, client retry sau.
      if (!existing) throw new ApiError(409, "Yêu cầu với Idempotency-Key này đang được xử lý")

      if (existing.status !== "completed") {
        throw new ApiError(409, "Yêu cầu với Idempotency-Key này đang được xử lý")
      }
      if (existing.requestHash !== requestHash) {
        throw new ApiError(422, "Idempotency-Key đã được dùng cho nội dung khác")
      }

      // Replay: trả đúng status + body đã lưu, đánh dấu để client biết.
      return new Response(existing.responseBody ?? "", {
        status: (existing.responseStatus ?? 200) as ContentfulStatusCode,
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Replayed": "true",
        },
      })
    }

    try {
      await next()
    } catch (error) {
      // Lưới an toàn: Hono thường đã đổi lỗi handler thành Response, nhưng nếu
      // lỗi thoát ra tới đây thì hàng `pending` phải bị xoá, nếu không key bị
      // khoá tới hết TTL và client không retry được.
      await prisma.idempotencyKey
        .delete({ where: { key_userId: { key, userId } } })
        .catch(() => undefined)
      throw error
    }

    const response = c.res
    if (response.status >= 500) {
      await prisma.idempotencyKey
        .delete({ where: { key_userId: { key, userId } } })
        .catch(() => undefined)
      return
    }

    const responseBody = await response.clone().text()
    await prisma.idempotencyKey.update({
      where: { key_userId: { key, userId } },
      data: {
        status: "completed",
        responseStatus: response.status,
        responseBody,
        expiresAt: new Date(Date.now() + TTL_MS),
      },
    })
  })
}
