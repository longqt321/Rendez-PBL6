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
import { recordEventForRequest } from "../lib/interaction-events"
import { rateLimit } from "../lib/rate-limit"
import { listPosts } from "../lib/posts"
import { rankPlaceSuggestions } from "../lib/ranking"
import { jsonWithCache } from "../lib/http-cache"
import { getDailyPicks, getPickDate } from "../lib/daily-picks"
import { getRecommendedPlaces } from "../lib/recommendations"
import {
  fetchPublishedRankCandidatesWithStatus,
  normalizeCaption,
  toSuggestionCandidate,
  toSuggestionPlaceSummary,
} from "../lib/suggestions"

const PLACES_PAGE_SIZE = 9

const PLACE_POSTS_PAGE_SIZE = 5

const MAP_MAX_PLACES = 300

const MAX_SUGGESTIONS = 10
const DEFAULT_SUGGESTIONS = 3

const MIN_CAPTION_CHARS = 8

export function createPlacesRouter() {
  const router = new Hono<AppEnv>()

  router.get(
    "/places",
    rateLimit({ scope: "places-list", limit: 120, windowSeconds: 60 }),
    async (c) => {
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

      // Tín hiệu tìm kiếm cho recommendation (P0): chỉ ghi khi có `q` thật.
      // Fire-and-forget — telemetry không được cộng round-trip DB vào latency
      // của endpoint search (cùng lý do với `place_detail_view`).
      if (filters.q !== undefined && filters.q.trim().length > 0) {
        void recordEventForRequest(c, "search_query", {
          query: filters.q,
          context: { resultsCount: page.total },
        })
      }

      // Hiện chưa có cache ứng dụng cho danh sách → `cacheHit` luôn false; không
      // bịa true khi body đến thẳng từ DB.
      return c.json({
        items: page.items,
        next: page.next ? encodePlaceCursor(page.next) : null,
        meta: { tookMs, cacheHit: false, totalResults: page.total, didYouMean },
      })
    },
  )

  // Đứng trước `/places/:id` — nếu không `:id` sẽ nuốt cả "map"/"saved"/"suggestions".
  router.get("/places/suggestions", async (c) => {
    const caption = c.req.query("q") ?? ""
    // Chặn query dài bất thường (lạm dụng/đo hiệu năng) — caption hợp lệ là
    // nội dung bài đăng, không bao giờ tới 500 ký tự.
    if (caption.length > 500) return c.json({ suggestions: [] })
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

  router.get("/places/recommended", async (c) => {
    const viewer = await getViewer(c)
    const rawLimit = Number(c.req.query("limit") ?? 6)
    const limit = Number.isFinite(rawLimit) ? Math.min(20, Math.max(1, Math.trunc(rawLimit))) : 6

    const startedAt = performance.now()
    const result = await getRecommendedPlaces(
      { userId: viewer?.id ?? null, anonId: viewer ? null : (c.req.query("anonId") ?? null) },
      limit,
    )
    const tookMs = Math.round(performance.now() - startedAt)

    return c.json({
      items: result.items,
      next: null,
      meta: {
        tookMs,
        cacheHit: false,
        totalResults: result.items.length,
        strategy: result.strategy,
        seedCount: result.seedCount,
      },
    })
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

  router.get("/places/saved", requireAuth, async (c) => {
    const rawCursor = c.req.query("cursor")
    const cursor = rawCursor ? decodeCursor(rawCursor) : null
    if (rawCursor && !cursor) throw new ApiError(400, "Cursor không hợp lệ")

    const page = await listSavedPlaces(c.get("userId"), cursor, PLACES_PAGE_SIZE)
    return c.json({ items: page.items, next: page.next ? encodeCursor(page.next) : null })
  })

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
    // Fire-and-forget: telemetry không được cộng round-trip DB vào latency.
    void recordEventForRequest(c, "place_detail_view", { placeId: id })
    return jsonWithCache(c, place, { maxAge: 60 })
  })

  return router
}
