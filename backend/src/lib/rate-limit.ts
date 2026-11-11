import { createMiddleware } from "hono/factory"
import type { AppEnv } from "../app"
import { env } from "../env"
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
  /**
   * Đếm theo userId thay vì IP — dùng cho route đã qua `requireAuth` để NHIỀU
   * người dùng chung một IP (văn phòng, NAT) không chặn lẫn nhau. Thiếu userId
   * (không đăng nhập) thì rơi về IP như mặc định.
   */
  byUser?: boolean
}

/** Đổi IPv4 dạng chuỗi sang số nguyên 32-bit; `null` nếu không phải IPv4 hợp lệ. */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".")
  if (parts.length !== 4) return null
  let value = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/u.test(part)) return null
    const octet = Number(part)
    if (octet > 255) return null
    value = value * 256 + octet
  }
  return value >>> 0
}

/** `address` có khớp mẫu proxy (`1.2.3.4` hoặc `10.0.0.0/8`) không. */
function matchesProxy(address: string, pattern: string): boolean {
  const [network, bitsRaw] = pattern.split("/")
  if (bitsRaw === undefined) return address === pattern

  const bits = Number(bitsRaw)
  const addressInt = ipv4ToInt(address)
  const networkInt = ipv4ToInt(network ?? "")
  if (addressInt === null || networkInt === null) return false
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false

  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
  return (addressInt & mask) === (networkInt & mask)
}

/**
 * IP người gọi, chống giả mạo `X-Forwarded-For`.
 *
 * - Có `remoteAddress` (Bun cung cấp từ socket): chỉ tin `X-Forwarded-For` khi
 *   chính địa chỉ socket nằm trong `TRUSTED_PROXIES`; ngược lại dùng địa chỉ
 *   socket — client tự gửi header không né được rate limit.
 * - Không có `remoteAddress` (test gọi `app.request()` trực tiếp, runtime không
 *   cung cấp socket): dùng `X-Forwarded-For` — đây là trường hợp duy nhất không
 *   xác thực được nguồn, và production luôn có `remoteAddress`.
 */
export function clientIp(headers: Headers, remoteAddress: string | undefined): string {
  const forwarded = headers.get("x-forwarded-for")
  const fromTrustedProxy =
    remoteAddress !== undefined &&
    env.trustedProxies.some((pattern) => matchesProxy(remoteAddress, pattern))

  if (forwarded && (fromTrustedProxy || remoteAddress === undefined)) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }

  return remoteAddress || headers.get("x-real-ip") || "unknown"
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

/** Middleware giới hạn theo IP (hoặc userId khi `byUser`) + scope; vượt trả 429 kèm `Retry-After`. */
export function rateLimit(options: RateLimitOptions) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const identity = options.byUser
      ? (c.get("userId") ?? clientIp(c.req.raw.headers, c.env?.remoteAddress))
      : clientIp(c.req.raw.headers, c.env?.remoteAddress)
    const key = options.byUser
      ? `${options.scope}:user:${identity}`
      : `${options.scope}:${identity}`
    const { count, resetAt } = await hitRateLimit(key, options.windowSeconds)
    if (count > options.limit) {
      const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))
      c.header("Retry-After", String(retryAfter))
      throw new ApiError(429, "Bạn thao tác quá nhanh, vui lòng thử lại sau")
    }
    await next()
  })
}
