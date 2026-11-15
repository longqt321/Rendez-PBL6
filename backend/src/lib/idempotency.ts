import { createHash } from "node:crypto"
import { createMiddleware } from "hono/factory"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import type { AppEnv } from "../app"
import { ApiError } from "./errors"
import { prisma } from "./prisma"

const TTL_MS = 24 * 60 * 60 * 1000

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
