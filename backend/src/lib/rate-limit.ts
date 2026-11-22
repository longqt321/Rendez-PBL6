import { BlockList, isIP } from "node:net"
import { createMiddleware } from "hono/factory"
import { LRUCache } from "lru-cache"
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

function normalizeIp(ip: string): string {
  const trimmed = ip.trim()
  return trimmed.startsWith("::ffff:") ? trimmed.slice(7) : trimmed
}

function buildProxyBlockList(patterns: readonly string[]): BlockList {
  const list = new BlockList()
  for (const raw of patterns) {
    const pattern = raw.trim()
    if (!pattern) continue
    const [networkRaw, prefixRaw] = pattern.split("/")
    const network = normalizeIp(networkRaw ?? "")
    const family = isIP(network)
    if (family === 0) continue
    const type = family === 6 ? "ipv6" : "ipv4"

    if (prefixRaw === undefined) {
      list.addAddress(network, type)
      continue
    }
    const prefix = Number(prefixRaw)
    const maxPrefix = family === 6 ? 128 : 32
    if (Number.isInteger(prefix) && prefix >= 0 && prefix <= maxPrefix) {
      list.addSubnet(network, prefix, type)
    }
  }
  return list
}

const trustedProxyList = buildProxyBlockList(env.trustedProxies)

function isTrustedProxyAddress(address: string): boolean {
  if (env.trustedProxies.length === 0) return false
  const normalized = normalizeIp(address)
  const family = isIP(normalized)
  if (family === 0) return false
  return trustedProxyList.check(normalized, family === 6 ? "ipv6" : "ipv4")
}

export function clientIp(headers: Headers, remoteAddress: string | undefined): string {
  const normalizedRemote =
    remoteAddress && remoteAddress.trim().length > 0 ? normalizeIp(remoteAddress) : undefined
  const fromTrustedProxy = normalizedRemote !== undefined && isTrustedProxyAddress(normalizedRemote)

  // Chỉ đọc X-Forwarded-For / X-Real-IP khi kết nối đến từ trusted proxy (hoặc trong test in-process không có socket IP)
  if (fromTrustedProxy || normalizedRemote === undefined) {
    const forwarded = headers.get("x-forwarded-for")
    if (forwarded) {
      const hops = forwarded
        .split(",")
        .map((part) => normalizeIp(part))
        .filter((part) => part.length > 0)
      // Duyệt từ phải sang trái để lấy hop đầu tiên không phải trusted proxy (chống spoof X-Forwarded-For ở đầu chuỗi)
      for (let i = hops.length - 1; i >= 0; i--) {
        const hop = hops[i]!
        if (!isTrustedProxyAddress(hop)) return hop
      }
      if (hops[0]) return hops[0]
    }
    const realIp = headers.get("x-real-ip")?.trim()
    if (realIp) return normalizeIp(realIp)
  }

  return normalizedRemote ?? "unknown"
}

interface BucketEntry {
  count: number
  resetAt: number
}

// Dùng LRUCache chuẩn của cộng đồng để quản lý giới hạn bộ nhớ và TTL tự động
const memoryBuckets = new LRUCache<string, BucketEntry>({
  max: 20_000,
  ttl: 3600 * 1000,
})

export function hitRateLimit(key: string, windowSeconds: number): { count: number; resetAt: Date } {
  const now = Date.now()
  const entry = memoryBuckets.get(key)
  if (!entry || entry.resetAt <= now) {
    const resetAtTime = now + windowSeconds * 1000
    memoryBuckets.set(
      key,
      { count: 1, resetAt: resetAtTime },
      { ttl: Math.max(1000, windowSeconds * 1000) },
    )
    return { count: 1, resetAt: new Date(resetAtTime) }
  }

  entry.count += 1
  return { count: entry.count, resetAt: new Date(entry.resetAt) }
}

// Script Lua nguyên tử cho Redis Rate Limiter: INCR + EXPIRE chỉ trong 1 round-trip, chống kẹt key TTL = -1
const REDIS_RATE_LIMIT_LUA = `
local current = redis.call("INCR", KEYS[1])
local ttl = redis.call("TTL", KEYS[1])
if current == 1 or ttl < 0 then
  redis.call("EXPIRE", KEYS[1], tonumber(ARGV[1]))
  ttl = tonumber(ARGV[1])
end
return { current, ttl }
`

export async function hitRateLimitAsync(
  key: string,
  windowSeconds: number,
): Promise<{ count: number; resetAt: Date }> {
  const redis = getRedis()
  if (redis) {
    const startedAt = performance.now()
    try {
      const redisKey = `rl:${key}`
      const raw = (await redis.send("EVAL", [
        REDIS_RATE_LIMIT_LUA,
        "1",
        redisKey,
        String(windowSeconds),
      ])) as [number | string, number | string]
      const count = Number(raw?.[0] ?? 1)
      const ttl = Number(raw?.[1] ?? windowSeconds)
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
