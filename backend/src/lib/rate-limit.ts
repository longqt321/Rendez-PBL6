import { createMiddleware } from "hono/factory"
import type { AppEnv } from "../app"
import { env } from "../env"
import { prisma } from "./prisma"

export interface RateLimitOptions {
  limit: number

  windowSeconds: number

  scope: string

  byUser?: boolean
}

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
    // `byUser`: đếm theo userId (route đã qua requireAuth). userId rỗng/thiếu
    // (không đăng nhập) thì rơi về IP — nếu không, mọi user "rỗng" dùng chung
    // một khoá `scope:user:`.
    const userId = options.byUser ? c.get("userId") : undefined
    const identity =
      userId && userId.length > 0
        ? `user:${userId}`
        : clientIp(c.req.raw.headers, c.env?.remoteAddress)
    const key = `${options.scope}:${identity}`
    const { count, resetAt } = await hitRateLimit(key, options.windowSeconds)
    if (count > options.limit) {
      const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))
      // Trả response TRỰC TIẾP thay vì `c.header()` + `throw ApiError`: `onError`
      // của app dựng lại Response từ `HTTPException` nên header đặt trên context
      // bị rơi — client không nhận được `Retry-After`.
      return c.json({ message: "Bạn thao tác quá nhanh, vui lòng thử lại sau" }, 429, {
        "Retry-After": String(retryAfter),
      })
    }
    await next()
  })
}
