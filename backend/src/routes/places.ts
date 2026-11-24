import { Hono } from "hono"
import {
  addPlaceImagesInputSchema,
  parseNaturalFilterQuery,
  placeMediaKindSchema,
  validateProfileImageUrl,
  type PlaceMediaItem,
  type ProfileMediaFolder,
} from "@rendez/schema"
import type { AppEnv } from "../app"
import { env } from "../env"
import { isLocalMediaFallbackEnabled, localMediaBaseUrl } from "../lib/media-storage"
import { db, sql } from "../lib/kysely"
import { prisma } from "../lib/prisma"
import { idempotency } from "../lib/idempotency"
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
  selectPlacesQuery,
  toPlaceDto,
  type PlaceRow,
} from "../lib/places"
import { getViewer, requireAuth } from "../lib/session"
import { recordEventForRequest } from "../lib/interaction-events"
import { rateLimit } from "../lib/rate-limit"
import { listPosts } from "../lib/posts"
import { rankPlaceSuggestions } from "../lib/ranking"
import { createTtlCache, jsonWithCache } from "../lib/http-cache"
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

const placesListCache = createTtlCache<{
  items: Awaited<ReturnType<typeof listPlaces>>["items"]
  next: string | null
  total: number
  relaxedFilters?: boolean
  didYouMean: string | null
}>({ ttlMs: 15_000, maxEntries: 256, namespace: "places-list" })

const dailyPicksCache = createTtlCache<Awaited<ReturnType<typeof getDailyPicks>>>({
  ttlMs: 300_000,
  maxEntries: 8,
  namespace: "daily-picks",
})

const mapPlacesCache = createTtlCache<Awaited<ReturnType<typeof listPlacesInMap>>>({
  ttlMs: 30_000,
  maxEntries: 256,
  namespace: "places-map",
})

const placeDetailCache = createTtlCache<NonNullable<Awaited<ReturnType<typeof findPublicPlace>>>>({
  ttlMs: 60_000,
  maxEntries: 512,
  namespace: "place-detail",
})

const recommendedPlacesCache = createTtlCache<Awaited<ReturnType<typeof getRecommendedPlaces>>>({
  ttlMs: 20_000,
  maxEntries: 256,
  namespace: "places-recommended",
})

export function invalidatePlacesReadCaches(): void {
  placesListCache.clear()
  dailyPicksCache.clear()
  mapPlacesCache.clear()
  placeDetailCache.clear()
  recommendedPlacesCache.clear()
}

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
      const cursor = decoded?.kind === filters.sort ? decoded : null

      const startedAt = performance.now()
      const cacheKey = JSON.stringify({ filters, cursor })
      const { value: cached, hit } = await placesListCache.getWithStatus(cacheKey, async () => {
        const page = await listPlaces(filters, cursor, PLACES_PAGE_SIZE)
        const didYouMean =
          page.total === 0 && filters.q !== undefined && filters.q.trim().length >= 3
            ? await findDidYouMean(filters.q)
            : null
        return {
          items: page.items,
          next: page.next ? encodePlaceCursor(page.next) : null,
          total: page.total,
          ...(page.relaxedFilters ? { relaxedFilters: true } : {}),
          didYouMean,
        }
      })
      c.set("cacheHit", hit)
      const tookMs = Math.round(performance.now() - startedAt)

      // Tín hiệu tìm kiếm cho recommendation (P0): chỉ ghi khi có `q` thật.
      if (filters.q !== undefined && filters.q.trim().length > 0) {
        void recordEventForRequest(c, "search_query", {
          query: filters.q,
          context: { resultsCount: cached.total },
        })
      }

      const parsedChips = filters.q ? parseNaturalFilterQuery(filters.q).chips : []

      return c.json({
        items: cached.items,
        next: cached.next,
        meta: {
          tookMs,
          cacheHit: hit,
          totalResults: cached.total,
          didYouMean: cached.didYouMean,
          ...(parsedChips.length > 0 ? { parsedFilters: parsedChips } : {}),
          ...(cached.relaxedFilters ? { relaxedFilters: true } : {}),
        },
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
    const pickDate = getPickDate()
    const { value: result, hit } = await dailyPicksCache.getWithStatus(pickDate, () =>
      getDailyPicks(pickDate),
    )
    c.set("cacheHit", hit)
    const tookMs = Math.round(performance.now() - startedAt)

    return jsonWithCache(
      c,
      {
        date: result.date,
        items: result.items,
        next: null,
        meta: { tookMs, cacheHit: hit, totalResults: result.items.length },
      },
      { maxAge: 300, etagData: { date: result.date, items: result.items } },
    )
  })

  router.get("/places/recommended", async (c) => {
    const viewer = await getViewer(c)
    const rawLimit = Number(c.req.query("limit") ?? 6)
    const limit = Number.isFinite(rawLimit) ? Math.min(20, Math.max(1, Math.trunc(rawLimit))) : 6
    const anonId = viewer ? null : (c.req.query("anonId") ?? null)

    const startedAt = performance.now()
    let result: Awaited<ReturnType<typeof getRecommendedPlaces>>
    let cacheHit = false
    if (!viewer) {
      const cached = await recommendedPlacesCache.getWithStatus(
        `${anonId ?? "guest"}:${limit}`,
        () => getRecommendedPlaces({ userId: null, anonId }, limit),
      )
      result = cached.value
      cacheHit = cached.hit
      c.set("cacheHit", cacheHit)
    } else {
      result = await getRecommendedPlaces({ userId: viewer.id, anonId: null }, limit)
    }
    const tookMs = Math.round(performance.now() - startedAt)

    return c.json({
      items: result.items,
      next: null,
      meta: {
        tookMs,
        cacheHit,
        totalResults: result.items.length,
        strategy: result.strategy,
        seedCount: result.seedCount,
      },
    })
  })

  router.get("/places/map", async (c) => {
    const filters = parsePlaceFilters(c.req.query())
    const startedAt = performance.now()
    const { value: result, hit } = await mapPlacesCache.getWithStatus(JSON.stringify(filters), () =>
      listPlacesInMap(filters, MAP_MAX_PLACES),
    )
    c.set("cacheHit", hit)
    const tookMs = Math.round(performance.now() - startedAt)

    const parsedChips = filters.q ? parseNaturalFilterQuery(filters.q).chips : []

    return jsonWithCache(
      c,
      {
        items: result.items,
        total: result.total,
        meta: {
          tookMs,
          cacheHit: hit,
          totalResults: result.total,
          ...(parsedChips.length > 0 ? { parsedFilters: parsedChips } : {}),
          ...(result.relaxedFilters ? { relaxedFilters: true } : {}),
        },
      },
      { maxAge: 30, etagData: { items: result.items, total: result.total } },
    )
  })

  router.get("/places/saved", requireAuth, async (c) => {
    const rawCursor = c.req.query("cursor")
    const cursor = rawCursor ? decodeCursor(rawCursor) : null
    if (rawCursor && !cursor) throw new ApiError(400, "Cursor không hợp lệ")

    const page = await listSavedPlaces(c.get("userId"), cursor, PLACES_PAGE_SIZE)
    return c.json({
      items: page.items,
      next: page.next ? encodeCursor(page.next) : null,
      total: page.total,
    })
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

  router.get("/places/:id/media", async (c) => {
    const id = c.req.param("id")
    if (!SLUG_ID_RE.test(id)) throw new ApiError(404, "Không tìm thấy địa điểm")
    const found = await prisma.place.findFirst({
      where: { id, publishedAt: { not: null }, deletedAt: null },
      select: { id: true },
    })
    if (!found) throw new ApiError(404, "Không tìm thấy địa điểm")

    const rawKind = c.req.query("kind")
    const parsedKind = rawKind ? placeMediaKindSchema.safeParse(rawKind) : null
    if (parsedKind && !parsedKind.success) {
      throw new ApiError(400, "Loại ảnh không hợp lệ")
    }
    const placeMediaQuery = db
      .selectFrom("place_images as pi")
      .leftJoin("users as u", "u.id", "pi.uploaded_by_id")
      .where("pi.place_id", "=", id)
      .select([
        sql<string>`pi.id::text`.as("id"),
        "pi.url",
        sql<"venue" | "dish_real" | "menu_price">`pi.kind::text`.as("kind"),
        "pi.captured_at",
        sql<"place" | "post">`'place'::text`.as("source_type"),
        "u.name as author_name",
        sql<string | null>`NULL::text`.as("post_id"),
      ])

    const postMediaQuery = db
      .selectFrom("post_images as psi")
      .innerJoin("posts as p", "p.id", "psi.post_id")
      .innerJoin("users as u", "u.id", "p.author_id")
      .where("p.place_id", "=", id)
      .where("p.deleted_at", "is", null)
      .select([
        sql<string>`psi.id::text`.as("id"),
        "psi.url",
        sql<"venue" | "dish_real" | "menu_price">`psi.kind::text`.as("kind"),
        "psi.captured_at",
        sql<"place" | "post">`'post'::text`.as("source_type"),
        "u.name as author_name",
        sql<string | null>`p.id::text`.as("post_id"),
      ])

    let combined = db
      .selectFrom(placeMediaQuery.unionAll(postMediaQuery).as("combined"))
      .selectAll()
    if (parsedKind?.success) {
      combined = combined.where("combined.kind", "=", parsedKind.data)
    }

    const rows = await combined.orderBy("combined.captured_at", "desc").limit(60).execute()

    const items: PlaceMediaItem[] = rows.map((r) => ({
      id: r.id,
      url: r.url,
      kind: r.kind,
      capturedAt: r.captured_at.toISOString(),
      sourceType: r.source_type,
      ...(r.author_name ? { authorName: r.author_name } : {}),
      ...(r.post_id ? { postId: r.post_id } : {}),
    }))
    return c.json({ items, next: null })
  })

  router.post("/places/:id/images", requireAuth, idempotency(), async (c) => {
    const id = c.req.param("id")
    if (!SLUG_ID_RE.test(id)) throw new ApiError(404, "Không tìm thấy địa điểm")
    const found = await prisma.place.findFirst({
      where: { id, publishedAt: { not: null }, deletedAt: null },
      select: { id: true },
    })
    if (!found) throw new ApiError(404, "Không tìm thấy địa điểm")

    const raw = await c.req.json().catch(() => null)
    const parsed = addPlaceImagesInputSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dữ liệu ảnh không hợp lệ")
    }

    const userId = c.get("userId")
    const localFallback = isLocalMediaFallbackEnabled()
    const hasR2Public = env.r2Configured && env.R2_PUBLIC_BASE_URL.length > 0
    if (!hasR2Public && !localFallback) {
      throw new ApiError(400, "Tính năng ảnh chưa được cấu hình")
    }
    const fallbackBaseUrl = localFallback ? localMediaBaseUrl() : undefined
    const publicBaseUrl = hasR2Public ? env.R2_PUBLIC_BASE_URL : (fallbackBaseUrl ?? "")
    const folder: ProfileMediaFolder = "places"
    for (const img of parsed.data.images) {
      const check = validateProfileImageUrl(img.url, {
        userId,
        folder,
        publicBaseUrl,
        fallbackBaseUrl,
      })
      if (!check.ok) throw new ApiError(400, check.message)
    }

    const created = await prisma.$transaction(
      parsed.data.images.map((img, idx) =>
        prisma.placeImage.create({
          data: {
            placeId: id,
            url: img.url,
            kind: img.kind,
            uploadedById: userId,
            position: 100 + idx,
          },
          select: { id: true, url: true, kind: true, capturedAt: true },
        }),
      ),
    )
    invalidatePlacesReadCaches()

    return c.json(
      {
        items: created.map((item) => ({
          id: item.id,
          url: item.url,
          kind: item.kind,
          capturedAt: item.capturedAt.toISOString(),
          sourceType: "place" as const,
        })),
      },
      201,
    )
  })

  router.get("/places/:id/similar", async (c) => {
    const id = c.req.param("id")
    if (!SLUG_ID_RE.test(id)) throw new ApiError(404, "Không tìm thấy địa điểm")

    const place = await findPublicPlace(id)
    if (!place) throw new ApiError(404, "Không tìm thấy địa điểm")

    const rows = await selectPlacesQuery()
      .where("p.id", "!=", id)
      .where("p.published_at", "is not", null)
      .where("p.status", "!=", "closed")
      .where("p.deleted_at", "is", null)
      .where(sql<string>`p.category::text`, "=", place.category)
      .orderBy(sql`CASE WHEN p.district = ${place.district ?? null} THEN 0 ELSE 1 END`, "asc")
      .orderBy("r.positive_ratio", "desc")
      .orderBy("r.review_count", "desc")
      .limit(6)
      .execute()

    const items = rows.map((r) => toPlaceDto(r as PlaceRow))
    return jsonWithCache(c, { items }, { maxAge: 60 })
  })

  router.get("/places/:id", async (c) => {
    const id = c.req.param("id")
    if (!SLUG_ID_RE.test(id)) throw new ApiError(404, "Không tìm thấy địa điểm")

    const { value: place, hit } = await placeDetailCache.getWithStatus(id, async () => {
      const found = await findPublicPlace(id)
      if (!found) throw new ApiError(404, "Không tìm thấy địa điểm")
      return found
    })
    c.set("cacheHit", hit)
    // Fire-and-forget: telemetry không được cộng round-trip DB vào latency.
    void recordEventForRequest(c, "place_detail_view", { placeId: id })
    return jsonWithCache(c, place, { maxAge: 60 })
  })

  return router
}
