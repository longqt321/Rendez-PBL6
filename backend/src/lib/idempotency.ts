import { addHours } from "date-fns"
import { createHash } from "node:crypto"
import { createMiddleware } from "hono/factory"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import type { AppEnv } from "../app"
import { ApiError } from "./errors"
import { db } from "./kysely"
import { logger } from "./logger"
import { prisma } from "./prisma"

const TTL_HOURS = 24

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
    const expiresAt = addHours(now, TTL_HOURS)

    // Dọn hàng hết hạn — bảng nhỏ, xoá theo index mỗi lần ghi là đủ.
    await prisma.idempotencyKey.deleteMany({ where: { expiresAt: { lt: now } } })

    const claimed = await db
      .insertInto("idempotency_keys")
      .values({
        key,
        user_id: userId,
        request_hash: requestHash,
        status: "pending",
        expires_at: expiresAt,
      })
      .onConflict((oc) => oc.columns(["key", "user_id"]).doNothing())
      .returning("key")
      .execute()

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
      const replayStatus = existing.responseStatus ?? 200
      const isNoBodyStatus = replayStatus === 204 || replayStatus === 205 || replayStatus === 304
      return new Response(isNoBodyStatus ? null : (existing.responseBody ?? ""), {
        status: replayStatus as ContentfulStatusCode,
        headers: {
          ...(isNoBodyStatus ? {} : { "Content-Type": "application/json" }),
          "Idempotency-Replayed": "true",
          ...(c.get("requestId") ? { "X-Request-Id": c.get("requestId") } : {}),
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
        .catch((cleanupErr: unknown) => {
          logger.debug({ err: cleanupErr, key }, "Không dọn được pending idempotency key sau lỗi")
        })
      throw error
    }

    const response = c.res
    // Không chốt idempotency cho lỗi hệ thống (>= 500) hoặc lỗi phiên/giới hạn tốc độ tạm thời (401, 429)
    if (response.status >= 500 || response.status === 401 || response.status === 429) {
      await prisma.idempotencyKey
        .delete({ where: { key_userId: { key, userId } } })
        .catch((cleanupErr: unknown) => {
          logger.debug({ err: cleanupErr, key }, "Không dọn được idempotency key sau phản hồi lỗi")
        })
      return
    }

    const responseBody = await response.clone().text()
    await prisma.idempotencyKey.update({
      where: { key_userId: { key, userId } },
      data: {
        status: "completed",
        responseStatus: response.status,
        responseBody,
        expiresAt: addHours(new Date(), TTL_HOURS),
      },
    })
  })
}
