import { Hono } from "hono"
import type { Context } from "hono"
import type { AppEnv } from "../app"
import { SLUG_ID_RE, requireUuid } from "../lib/cursor"
import { ApiError } from "../lib/errors"
import { type OgMeta, notFoundOgMeta, placeOgMeta, postOgMeta, renderOgHtml } from "../lib/og"
import { findPublicPlaceWithVersion } from "../lib/places"
import { findPost } from "../lib/posts"

/**
 * HTML meta Open Graph cho bot preview (Facebook/Zalo/Messenger…).
 *
 * nginx sniff User-Agent rồi proxy `/discover/:id` và `/post/:id` sang đây khi
 * UA khớp bot; người dùng thường không bao giờ chạm route này. Trả HTML chỉ có
 * thẻ meta + `Cache-Control` để CDN phía trước (nếu có) cache đúng.
 *
 * Không requireAuth, không rate limit — đọc dữ liệu công khai, nginx đã cache
 * trước API (xem tài liệu thiết kế, mục 5).
 */

const CACHE_SECONDS = 600
/** 404 cache ngắn để quán mới publish sớm có preview đúng. */
const NOT_FOUND_CACHE_SECONDS = 60

/** Trả HTML meta kèm Cache-Control; 404 dùng meta mặc định của site. */
async function ogResponse(c: Context<AppEnv>, meta: OgMeta, status: 200 | 404): Promise<Response> {
  const maxAge = status === 200 ? CACHE_SECONDS : NOT_FOUND_CACHE_SECONDS
  return c.html(await renderOgHtml(meta), status, { "Cache-Control": `public, max-age=${maxAge}` })
}

export function createOgRouter() {
  const router = new Hono<AppEnv>()

  // Quán dùng slug id từ dataset — sai format coi như không tồn tại.
  router.get("/og/place/:id", async (c) => {
    const id = c.req.param("id")
    const path = `/discover/${id}`
    if (!SLUG_ID_RE.test(id)) return ogResponse(c, notFoundOgMeta(path), 404)

    const found = await findPublicPlaceWithVersion(id)
    if (!found) return ogResponse(c, notFoundOgMeta(path), 404)

    // `?v=` bust cache preview của nền tảng khi dữ liệu quán đổi.
    const version = Math.floor(found.updatedAt.getTime() / 1000)

    return ogResponse(c, placeOgMeta(found.place, version), 200)
  })

  // Bài đăng dùng uuid — sai format cũng 404 HTML (không phải JSON lỗi).
  router.get("/og/post/:id", async (c) => {
    const rawId = c.req.param("id")
    const path = `/post/${rawId}`

    let id: string
    try {
      id = requireUuid(rawId, "Không tìm thấy bài đăng")
    } catch (error) {
      // `requireUuid` ném ApiError(JSON) — ở đây cần 404 dạng HTML meta.
      if (!(error instanceof ApiError)) throw error
      return ogResponse(c, notFoundOgMeta(path), 404)
    }

    // Viewer null — bot chỉ thấy nội dung công khai, nhất quán với feed.
    const post = await findPost(id, null)
    if (!post) return ogResponse(c, notFoundOgMeta(path), 404)

    const version = Math.floor(new Date(post.createdAt).getTime() / 1000)
    return ogResponse(c, postOgMeta(post, version), 200)
  })

  return router
}
