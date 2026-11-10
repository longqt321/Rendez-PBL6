import { createMiddleware } from "hono/factory"
import type { AppEnv } from "../app"
import { ApiError } from "./errors"
import { prisma } from "./prisma"

/**
 * Rate limit dùng chính Postgres (H4) — không kéo `unstorage`/Redis.
 *
 * Bảng `rate_limits(key, window_start, count)` với khoá ghép: mỗi request là
 * một `INSERT ... ON CONFLICT DO UPDATE ... RETURNING count`, nguyên tử ở mức
 * hàng nên nhiều tiến trình đếm đúng. Cửa sổ cố định (fixed window) — đủ cho
 * mục tiêu chống brute-force, không cần thuật toán phức tạp.
 */

export interface RateLimitOptions {
  /** Số request tối đa trong một cửa sổ. */
  limit: number
  /** Độ dài cửa sổ (giây). */
  windowSeconds: number
  /** Tiền tố khoá — tách bộ đếm giữa các nhóm route. */
  scope: string
}

/** IP người gọi — sau proxy thì lấy phần tử đầu của `X-Forwarded-For`. */
function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  return headers.get("x-real-ip") ?? "unknown"
}

/**
 * Đếm một lượt cho `key`; trả số lượt trong cửa sổ hiện tại.
 * Dọn luôn cửa sổ cũ của chính key đó để bảng không phình.
 */
export async function hitRateLimit(
  key: string,
  windowSeconds: number,
): Promise<{ count: number; resetAt: Date }> {
  const windowMs = windowSeconds * 1000
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs)
  const resetAt = new Date(windowStart.getTime() + windowMs)

  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO rate_limits (key, window_start, count, updated_at)
    VALUES (${key}, ${windowStart}, 1, now())
    ON CONFLICT (key, window_start)
    DO UPDATE SET count = rate_limits.count + 1, updated_at = now()
    RETURNING count
  `

  // Cửa sổ cũ của cùng key không còn tác dụng — xoá để bảng chỉ còn dữ liệu sống.
  await prisma.rateLimit.deleteMany({
    where: { key, windowStart: { lt: windowStart } },
  })

  return { count: Number(rows[0]?.count ?? 1), resetAt }
}

/** Middleware giới hạn theo IP + scope; vượt ngưỡng trả 429 kèm `Retry-After`. */
export function rateLimit(options: RateLimitOptions) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const key = `${options.scope}:${clientIp(c.req.raw.headers)}`
    const { count, resetAt } = await hitRateLimit(key, options.windowSeconds)
    if (count > options.limit) {
      const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))
      c.header("Retry-After", String(retryAfter))
      throw new ApiError(429, "Bạn thao tác quá nhanh, vui lòng thử lại sau")
    }
    await next()
  })
}
