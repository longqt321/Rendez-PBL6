import { createHash } from "node:crypto"
import type { Context } from "hono"
import { LRUCache } from "lru-cache"
import { getRedis } from "./redis"
import { recordRedisTiming, setRequestCacheHit } from "./request-context"

function matchesEtag(header: string, etag: string): boolean {
  return header
    .split(",")
    .map((value) => value.trim().replace(/^W\//u, ""))
    .some((value) => value === etag || value === "*")
}

export function jsonWithCache(
  c: Context,
  data: unknown,
  options: { maxAge: number; scope?: "public" | "private"; etagData?: unknown },
): Response {
  const body = JSON.stringify(data)
  // `etagData`: nguồn tính ETag khi body có trường đo lường thay đổi mỗi lần
  // (`meta.tookMs`) — ETag phải ổn định thì 304 mới hoạt động. Mặc định ETag
  // tính từ chính body.
  const etagSource = JSON.stringify(options.etagData ?? data)
  const etag = `"${createHash("sha256").update(etagSource).digest("base64url")}"`
  const cacheControl =
    options.scope === "private" ? "private, no-cache" : `public, max-age=${options.maxAge}`

  const ifNoneMatch = c.req.header("if-none-match")
  if (ifNoneMatch && matchesEtag(ifNoneMatch, etag)) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": cacheControl },
    })
  }

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ETag: etag,
      "Cache-Control": cacheControl,
    },
  })
}

/** Dữ liệu riêng tư/thời gian thực: cấm mọi tầng cache lưu lại. */
export function noStore(c: Context, data: unknown): Response {
  const res = c.json(data)
  res.headers.set("Cache-Control", "no-store")
  return res
}

/**
 * Cache TTL chuẩn dùng `LRUCache` (`lru-cache`) kết hợp L2 Redis.
 *
 * Dùng `LRUCache` chuẩn thay vì tự quản lý `Map` FIFO thủ công; hỗ trợ
 * single-flight (`inflight`) để tránh cache stampede khi nhiều request cùng miss.
 */
export function createTtlCache<T>(options: {
  ttlMs: number
  maxEntries: number
  namespace?: string
}) {
  const entries = new LRUCache<string, { value: T }>({
    max: Math.max(1, options.maxEntries),
    ttl: Math.max(1, options.ttlMs),
  })
  const inflight = new Map<string, Promise<T>>()
  const ttlSeconds = Math.max(1, Math.ceil(options.ttlMs / 1000))
  const prefix = options.namespace ? `cache:${options.namespace}:` : "cache:"

  async function getWithStatus(
    key: string,
    load: () => Promise<T>,
  ): Promise<{ value: T; hit: boolean }> {
    const hit = entries.get(key)
    if (hit !== undefined) {
      setRequestCacheHit(true)
      return { value: hit.value, hit: true }
    }

    const redis = getRedis()
    if (redis) {
      const startedAt = performance.now()
      try {
        const raw = await redis.get(`${prefix}${key}`)
        if (raw !== null) {
          const parsed = JSON.parse(raw) as T
          entries.set(key, { value: parsed })
          setRequestCacheHit(true)
          return { value: parsed, hit: true }
        }
      } catch {
        // Fallback sang loader nếu Redis lỗi
      } finally {
        recordRedisTiming(performance.now() - startedAt)
      }
    }

    const pending = inflight.get(key)
    if (pending) return { value: await pending, hit: false }

    const promise = load()
      .then(async (value) => {
        entries.set(key, { value })
        if (redis) {
          try {
            await redis.set(`${prefix}${key}`, JSON.stringify(value), "EX", ttlSeconds)
          } catch {
            // Không làm hỏng luồng chính khi cache write lỗi
          }
        }
        return value
      })
      .finally(() => {
        inflight.delete(key)
      })

    inflight.set(key, promise)
    return { value: await promise, hit: false }
  }

  return {
    async get(key: string, load: () => Promise<T>): Promise<T> {
      return (await getWithStatus(key, load)).value
    },

    getWithStatus,

    clear(): void {
      entries.clear()
    },
  }
}
