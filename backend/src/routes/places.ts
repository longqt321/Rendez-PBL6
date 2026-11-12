import { Hono } from "hono"
import type { AppEnv } from "../app"
import {
  SLUG_ID_RE,
  decodeCursor,
  decodePlaceCursor,
  encodeCursor,
  encodePlaceCursor,
} from "../lib/cursor"
import { ApiError } from "../lib/errors"
import {
  findDidYouMean,
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
  fetchPublishedRankCandidatesWithStatus,
  normalizeCaption,
  toSuggestionCandidate,
  toSuggestionPlaceSummary,
} from "../lib/suggestions"

/**
 * Route địa điểm (Phase 2) — khớp hợp đồng Phần A:
 * - `GET /places` `Page<Place>` + cursor keyset + bộ lọc A7.9.
 * - `GET /places/map` `{items, total}` chặn 300.
 * - `GET /places/:id` 404 khi chưa publish (A6.6).
 *
 * Các endpoint danh sách gắn `meta` (tookMs/cacheHit/totalResults) — metadata
 * vận hành đo server-side, không phải số liệu bịa; `didYouMean` chỉ có khi `q`
 * trả về 0 kết quả.
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
    const decoded = rawCursor ? decodePlaceCursor(rawCursor) : null
    if (rawCursor && !decoded) {
      throw new ApiError(400, "Cursor không hợp lệ")
    }
    // Cursor hợp lệ nhưng thuộc kiểu sắp xếp khác (đổi sort / link cũ) → trả
    // trang đầu thay vì 400: đổi sort là hành động hợp lệ, không được làm vỡ
    // trang. Xem comment ngoại lệ trong `lib/cursor.ts`.
    const cursor = decoded && decoded.kind === filters.sort ? decoded : null

    const startedAt = performance.now()
    const page = await listPlaces(filters, cursor, PLACES_PAGE_SIZE)

    // "Ý bạn là…": chỉ khi tìm kiếm KHÔNG có kết quả nào và từ khoá đủ dài để
    // trigram có ý nghĩa (ngắn hơn là so khớp ngẫu nhiên).
    const didYouMean =
      page.total === 0 && filters.q !== undefined && filters.q.trim().length >= 3
        ? await findDidYouMean(filters.q)
        : null
    // Đo SAU didYouMean: đó cũng là một query DB thật trong cùng response, đo
    // trước sẽ báo tookMs thấp hơn thời gian người dùng thực sự chờ.
    const tookMs = Math.round(performance.now() - startedAt)

    // Hiện chưa có cache ứng dụng cho danh sách → `cacheHit` luôn false; không
    // bịa true khi body đến thẳng từ DB.
    return c.json({
      items: page.items,
      next: page.next ? encodePlaceCursor(page.next) : null,
      meta: { tookMs, cacheHit: false, totalResults: page.total, didYouMean },
    })
  })

  // Đứng trước `/places/:id` — nếu không `:id` sẽ nuốt cả "map"/"saved"/"suggestions".
  router.get("/places/suggestions", async (c) => {
    const caption = c.req.query("q") ?? ""
    if (caption.trim().length < MIN_CAPTION_CHARS) return c.json({ suggestions: [] })

    const rawLimit = Number(c.req.query("limit") ?? DEFAULT_SUGGESTIONS)
    const limit = Number.isFinite(rawLimit)
      ? Math.min(MAX_SUGGESTIONS, Math.max(1, Math.trunc(rawLimit)))
      : DEFAULT_SUGGESTIONS

    const startedAt = performance.now()
    const [captionNorm, candidates] = await Promise.all([
      normalizeCaption(caption),
      fetchPublishedRankCandidatesWithStatus(),
    ])
    const tookMs = Math.round(performance.now() - startedAt)
    // Cache ứng dụng của danh sách ứng viên — gắn vào context để middleware
    // metrics đếm `cacheHits` thật (không đoán).
    c.set("cacheHit", candidates.cacheHit)

    const ranked = rankPlaceSuggestions(
      captionNorm,
      candidates.rows.map(toSuggestionCandidate),
      limit,
    )
    return c.json({
      suggestions: ranked.map(({ candidate, reason }) => ({
        place: toSuggestionPlaceSummary(candidate.row, true),
        reason,
      })),
      meta: {
        tookMs,
        cacheHit: candidates.cacheHit,
        totalResults: ranked.length,
      },
    })
  })

  /**
   * "Gợi ý hôm nay" — 3 quán do job `daily-picks` chọn mỗi ngày. Không tham số,
   * không phụ thuộc người xem; chưa có picks thì trả `items: []` (200, không
   * phải lỗi) để FE thu gọn dải. Đứng trước `/places/:id`.
   */
  router.get("/places/daily-picks", async (c) => {
    const startedAt = performance.now()
    const result = await getDailyPicks(getPickDate())
    const tookMs = Math.round(performance.now() - startedAt)
    // Công khai, giống nhau với mọi người — 5 phút đủ gánh traffic trong ngày
    // mà vẫn ngắn hơn chu kỳ đổi dữ liệu (ngày). `cacheHit` là cache ỨNG DỤNG
    // (chưa có cho route này) nên false — HTTP cache không tính.
    // ETag tính từ dữ liệu ổn định (bỏ `meta.tookMs`) — nếu tính cả tookMs thì
    // ETag đổi mỗi request và 304 không bao giờ khớp.
    return jsonWithCache(
      c,
      {
        date: result.date,
        items: result.items,
        next: null,
        meta: { tookMs, cacheHit: false, totalResults: result.items.length },
      },
      { maxAge: 300, etagData: { date: result.date, items: result.items } },
    )
  })

  router.get("/places/map", async (c) => {
    const filters = parsePlaceFilters(c.req.query())
    const startedAt = performance.now()
    const result = await listPlacesInMap(filters, MAP_MAX_PLACES)
    const tookMs = Math.round(performance.now() - startedAt)
    // Dữ liệu công khai, đổi chậm — cho phép trình duyệt/CDN dùng lại 30 giây.
    // Giữ `total` cũ (FE đang dùng) và thêm `meta` cùng giá trị. ETag bỏ tookMs.
    return jsonWithCache(
      c,
      {
        items: result.items,
        total: result.total,
        meta: { tookMs, cacheHit: false, totalResults: result.total },
      },
      { maxAge: 30, etagData: { items: result.items, total: result.total } },
    )
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
