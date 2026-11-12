import { Hono } from "hono"
import type { AppEnv } from "../app"
import { SLUG_ID_RE, decodeCursor, encodeCursor } from "../lib/cursor"
import { ApiError } from "../lib/errors"
import {
  findPublicPlace,
  listPlaces,
  listPlacesInMap,
  listSavedPlaces,
  parsePlaceFilters,
} from "../lib/places"
import { getViewer, requireAuth } from "../lib/session"
import { listPosts } from "../lib/posts"
import { rankPlaceSuggestions } from "../lib/ranking"
import { jsonWithCache } from "../lib/http-cache"
import { getDailyPicks, getPickDate } from "../lib/daily-picks"
import {
  fetchPublishedRankCandidates,
  normalizeCaption,
  toSuggestionCandidate,
  toSuggestionPlaceSummary,
} from "../lib/suggestions"

/**
 * Route địa điểm (Phase 2) — khớp hợp đồng Phần A:
 * - `GET /places` `Page<Place>` + cursor keyset + bộ lọc A7.9.
 * - `GET /places/map` `{items, total}` chặn 300.
 * - `GET /places/:id` 404 khi chưa publish (A6.6).
 */

/** Khớp mock (`PLACES_PAGE_SIZE = 9`) — FE infinite scroll không phụ thuộc số này. */
const PLACES_PAGE_SIZE = 9
/** Bài đăng gắn địa điểm — cùng cỡ trang với feed cộng đồng. */
const PLACE_POSTS_PAGE_SIZE = 5
/** Chặn trên cho `/places/map` — khung nhìn zoom nhỏ không trả cả dataset. */
const MAP_MAX_PLACES = 300
/** Số gợi ý tối đa một lần hỏi (A5: suggestion ≤ 10). */
const MAX_SUGGESTIONS = 10
const DEFAULT_SUGGESTIONS = 3
/** Caption ngắn hơn ngưỡng thì không gợi ý (A7.1). */
const MIN_CAPTION_CHARS = 8

/** Id place là slug từ dataset (`mirkocoffeechillbeer-493`), không phải uuid. */

export function createPlacesRouter() {
  const router = new Hono<AppEnv>()

  router.get("/places", async (c) => {
    const filters = parsePlaceFilters(c.req.query())
    const rawCursor = c.req.query("cursor")
    const cursor = rawCursor ? decodeCursor(rawCursor) : null
    if (rawCursor && !cursor) {
      throw new ApiError(400, "Cursor không hợp lệ")
    }

    const page = await listPlaces(filters, cursor, PLACES_PAGE_SIZE)
    return c.json({ items: page.items, next: page.next ? encodeCursor(page.next) : null })
  })

  // Đứng trước `/places/:id` — nếu không `:id` sẽ nuốt cả "map"/"saved"/"suggestions".
  router.get("/places/suggestions", async (c) => {
    const caption = c.req.query("q") ?? ""
    if (caption.trim().length < MIN_CAPTION_CHARS) return c.json({ suggestions: [] })

    const rawLimit = Number(c.req.query("limit") ?? DEFAULT_SUGGESTIONS)
    const limit = Number.isFinite(rawLimit)
      ? Math.min(MAX_SUGGESTIONS, Math.max(1, Math.trunc(rawLimit)))
      : DEFAULT_SUGGESTIONS

    const [captionNorm, rows] = await Promise.all([
      normalizeCaption(caption),
      fetchPublishedRankCandidates(),
    ])

    const ranked = rankPlaceSuggestions(captionNorm, rows.map(toSuggestionCandidate), limit)
    return c.json({
      suggestions: ranked.map(({ candidate, reason }) => ({
        place: toSuggestionPlaceSummary(candidate.row, true),
        reason,
      })),
    })
  })

  /**
   * "Gợi ý hôm nay" — 3 quán do job `daily-picks` chọn mỗi ngày. Không tham số,
   * không phụ thuộc người xem; chưa có picks thì trả `items: []` (200, không
   * phải lỗi) để FE thu gọn dải. Đứng trước `/places/:id`.
   */
  router.get("/places/daily-picks", async (c) => {
    const result = await getDailyPicks(getPickDate())
    // Công khai, giống nhau với mọi người — 5 phút đủ gánh traffic trong ngày
    // mà vẫn ngắn hơn chu kỳ đổi dữ liệu (ngày).
    return jsonWithCache(c, result, { maxAge: 300 })
  })

  router.get("/places/map", async (c) => {
    const filters = parsePlaceFilters(c.req.query())
    const result = await listPlacesInMap(filters, MAP_MAX_PLACES)
    // Dữ liệu công khai, đổi chậm — cho phép trình duyệt/CDN dùng lại 30 giây.
    return jsonWithCache(c, result, { maxAge: 30 })
  })

  /** "Đã lưu" — hợp các bộ sưu tập của chính mình (đứng trước `/places/:id`). */
  router.get("/places/saved", requireAuth, async (c) => {
    const rawCursor = c.req.query("cursor")
    const cursor = rawCursor ? decodeCursor(rawCursor) : null
    if (rawCursor && !cursor) throw new ApiError(400, "Cursor không hợp lệ")

    const page = await listSavedPlaces(c.get("userId"), cursor, PLACES_PAGE_SIZE)
    return c.json({ items: page.items, next: page.next ? encodeCursor(page.next) : null })
  })

  /**
   * Bài đăng gắn địa điểm (FE `usePlacePosts`, phân trang cursor).
   *
   * Đứng trước `/places/:id` để không bị route chi tiết nuốt; địa điểm chưa
   * publish coi như không tồn tại (khớp mock).
   */
  router.get("/places/:id/posts", async (c) => {
    const id = c.req.param("id")
    if (!SLUG_ID_RE.test(id)) throw new ApiError(404, "Không tìm thấy địa điểm")

    const place = await findPublicPlace(id)
    if (!place) throw new ApiError(404, "Không tìm thấy địa điểm")

    const rawCursor = c.req.query("cursor")
    const cursor = rawCursor ? decodeCursor(rawCursor) : null
    if (rawCursor && !cursor) throw new ApiError(400, "Cursor không hợp lệ")

    const viewer = await getViewer(c)
    const page = await listPosts({
      filter: "all",
      viewerId: viewer?.id ?? null,
      placeId: id,
      cursor,
      pageSize: PLACE_POSTS_PAGE_SIZE,
    })
    return c.json({ items: page.items, next: page.next ? encodeCursor(page.next) : null })
  })

  router.get("/places/:id", async (c) => {
    const id = c.req.param("id")
    if (!SLUG_ID_RE.test(id)) throw new ApiError(404, "Không tìm thấy địa điểm")

    const place = await findPublicPlace(id)
    if (!place) throw new ApiError(404, "Không tìm thấy địa điểm")
    return jsonWithCache(c, place, { maxAge: 60 })
  })

  return router
}
