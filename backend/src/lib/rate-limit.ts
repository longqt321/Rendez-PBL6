import { createMiddleware } from "hono/factory"
import type { AppEnv } from "../app"
import { env } from "../env"
import { logger } from "./logger"
import { getRedis } from "./redis"
import { recordRedisTiming } from "./request-context"

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

interface BucketEntry {
  count: number
  resetAt: number
}

// In-Memory sliding window map để bảo vệ DB khỏi cạn kiệt connection/IO khi bị tấn công DDoS/Flood
const memoryBuckets = new Map<string, BucketEntry>()

// Dọn dẹp định kỳ các bucket đã hết hạn để tránh leak memory
const CLEANUP_INTERVAL_MS = 60_000
let lastCleanup = Date.now()

function sweepExpiredBuckets(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [key, entry] of memoryBuckets.entries()) {
    if (entry.resetAt <= now) {
      memoryBuckets.delete(key)
    }
  }
}

export function hitRateLimit(key: string, windowSeconds: number): { count: number; resetAt: Date } {
  const now = Date.now()
  sweepExpiredBuckets(now)

  const entry = memoryBuckets.get(key)
  if (!entry || entry.resetAt <= now) {
    const resetAtTime = now + windowSeconds * 1000
    memoryBuckets.set(key, { count: 1, resetAt: resetAtTime })
    return { count: 1, resetAt: new Date(resetAtTime) }
  }

  entry.count += 1
  return { count: entry.count, resetAt: new Date(entry.resetAt) }
}

export async function hitRateLimitAsync(
  key: string,
  windowSeconds: number,
): Promise<{ count: number; resetAt: Date }> {
  const redis = getRedis()
  if (redis) {
    const startedAt = performance.now()
    try {
      const redisKey = `rl:${key}`
      const count = await redis.incr(redisKey)
      if (count === 1) {
        await redis.expire(redisKey, windowSeconds)
      }
      const ttl = await redis.ttl(redisKey)
      const resetMs = Date.now() + Math.max(1, ttl > 0 ? ttl : windowSeconds) * 1000
      return { count, resetAt: new Date(resetMs) }
    } catch (err) {
      logger.warn({ err, key }, "Redis rate-limit lỗi, fallback in-memory")
    } finally {
      recordRedisTiming(performance.now() - startedAt)
    }
  }
  return hitRateLimit(key, windowSeconds)
}

/** Middleware giới hạn theo IP (hoặc userId khi `byUser`) + scope; vượt trả 429 kèm `Retry-After`. */
export function rateLimit(options: RateLimitOptions) {
  return createMiddleware<AppEnv>(async (c, next) => {
    // Nếu có cờ BYPASS_RATE_LIMIT (dành riêng cho các bài test tải trang / crawl)
    if (process.env.BYPASS_RATE_LIMIT === "1") {
      await next()
      return
    }

    const userId = options.byUser ? c.get("userId") : undefined
    const identity =
      userId && userId.length > 0
        ? `user:${userId}`
        : clientIp(c.req.raw.headers, c.env?.remoteAddress)
    const key = `${options.scope}:${identity}`
    const { count, resetAt } = await hitRateLimitAsync(key, options.windowSeconds)
    if (count > options.limit) {
      const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))
      return c.json({ message: "Bạn thao tác quá nhanh, vui lòng thử lại sau" }, 429, {
        "Retry-After": String(retryAfter),
      })
    }

    await next()
  })
}
