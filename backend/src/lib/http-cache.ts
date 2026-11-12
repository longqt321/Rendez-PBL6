import { createHash } from "node:crypto"
import type { Context } from "hono"

/**
 * Cache HTTP + cache trong tiến trình (G2).
 *
 * - `jsonWithCache`: gắn `ETag` + `Cache-Control`, trả 304 khi client gửi
 *   `If-None-Match` khớp — trình duyệt/CDN không tải lại body không đổi. Chỉ
 *   dùng `max-age` cho dữ liệu công khai; dữ liệu phụ thuộc người xem phải
 *   `scope: "private"` (revalidate mỗi lần, xem chú thích hàm).
 * - `noStore`: chặn cache cho dữ liệu riêng tư/thay đổi liên tục (`/me`,
 *   `/notifications`).
 * - `createTtlCache`: cache TTL nhỏ trong bộ nhớ + single-flight (nhiều request
 *   cùng key chỉ chạy loader một lần). Không thêm dependency (DECISIONS 27).
 */

/** So khớp `If-None-Match` với ETag hiện tại (hỗ trợ danh sách và tiền tố `W/`). */
function matchesEtag(header: string, etag: string): boolean {
  return header
    .split(",")
    .map((value) => value.trim().replace(/^W\//u, ""))
    .some((value) => value === etag || value === "*")
}

/**
 * Trả JSON kèm `ETag` + `Cache-Control`; 304 (không body) khi ETag không đổi.
 *
 * ETag tính từ chính body đã serialize — không phụ thuộc thứ tự cột DB, và tự
 * đổi khi dữ liệu đổi nên không cần invalidate thủ công.
 *
 * Hai chế độ, KHÁC nhau về quyền được dùng lại body mà không hỏi server:
 * - `public` (mặc định): dữ liệu giống nhau với mọi người (địa điểm, danh sách
 *   quán) → `public, max-age=<n>`, trình duyệt/CDN dùng lại body trong `<n>`
 *   giây mà không gọi server. Đây là lợi ích cache cần giữ.
 * - `private`: body phụ thuộc người xem (`followedByMe`, `likedByMe`, tab
 *   `saved`…) → `private, no-cache`: trình duyệt vẫn LƯU để tiết kiệm băng thông
 *   nhưng **buộc revalidate** mỗi lần đọc, nên sau mutation (theo dõi, thích)
 *   lần refetch kế tiếp luôn thấy dữ liệu mới. Trước đây chế độ này cũng gắn
 *   `max-age=15` nên refetch trong 15 giây trả lại body CŨ từ disk cache — nút
 *   "Theo dõi" không đổi trạng thái dù DB đã có row (V3-01).
 *   Không dùng `no-store` để còn giữ được 304 + ETag.
 */
export function jsonWithCache(
  c: Context,
  data: unknown,
  options: { maxAge: number; scope?: "public" | "private" },
): Response {
  const body = JSON.stringify(data)
  const etag = `"${createHash("sha256").update(body).digest("base64url")}"`
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
 * Cache TTL trong bộ nhớ tiến trình.
 *
 * `maxEntries` chặn rò rỉ bộ nhớ; `Map` giữ thứ tự chèn nên xoá phần tử cũ
 * nhất là O(1). Single-flight: request thứ hai cùng key trong lúc loader đang
 * chạy sẽ chờ đúng promise đó thay vì bắn thêm query.
 */
export function createTtlCache<T>(options: { ttlMs: number; maxEntries: number }) {
  const entries = new Map<string, { value: T; expiresAt: number }>()
  const inflight = new Map<string, Promise<T>>()

  return {
    async get(key: string, load: () => Promise<T>): Promise<T> {
      const hit = entries.get(key)
      if (hit && hit.expiresAt > Date.now()) return hit.value

      const pending = inflight.get(key)
      if (pending) return pending

      const promise = load()
        .then((value) => {
          entries.set(key, { value, expiresAt: Date.now() + options.ttlMs })
          if (entries.size > options.maxEntries) {
            const oldest = entries.keys().next().value
            if (oldest !== undefined) entries.delete(oldest)
          }
          return value
        })
        .finally(() => {
          inflight.delete(key)
        })

      inflight.set(key, promise)
      return promise
    },

    clear(): void {
      entries.clear()
    },
  }
}
