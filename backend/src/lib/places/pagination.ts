import { Prisma } from "../../../generated/prisma/client"
import { prisma } from "../prisma"
import { selectPlaces } from "./select"
import { toPlaceDto, type PlaceDto, type PlaceRow, type PlaceFilters } from "./types"
import { distanceSql } from "./spatial"
import { promotePlaceFilters } from "./query-promotion"
import { hybridSearch, HYBRID_MAX_RESULTS } from "../search/hybrid"
import { NAME_HAYSTACK } from "../search/name-matcher"
import { normalizeSearchText } from "../search-synonyms"
import type { PlaceCursor, PlaceSort } from "../cursor"

export function cursorForSort(sort: PlaceSort, row: PlaceRow): PlaceCursor {
  switch (sort) {
    case "rating":
      return {
        kind: "rating",
        rating: Number(row.rating),
        reviewCount: Number(row.review_count),
        createdAt: row.created_at,
        id: row.id,
      }
    case "distance":
      return { kind: "distance", distance: row.distance_km ?? null, id: row.id }
    default:
      return { kind: "newest", createdAt: row.created_at, id: row.id }
  }
}

interface SortClause {
  orderBy: Prisma.Sql
  extraSelect: Prisma.Sql
  keyset: Prisma.Sql | null
}

function buildSortClause(
  sort: PlaceSort,
  cursor: PlaceCursor | null,
  lat?: number,
  lng?: number,
): SortClause {
  const matchingCursor = cursor?.kind === sort ? cursor : null

  switch (sort) {
    case "rating": {
      const keyset =
        matchingCursor?.kind === "rating"
          ? Prisma.sql`(COALESCE(r.rating, 0), r.review_count, p.created_at, p.id)
          < (${matchingCursor.rating}::float8, ${matchingCursor.reviewCount}::int, ${matchingCursor.createdAt}::timestamptz, ${matchingCursor.id})`
          : null
      return {
        orderBy: Prisma.sql`COALESCE(r.rating, 0) DESC, r.review_count DESC, p.created_at DESC, p.id DESC`,
        extraSelect: Prisma.empty,
        keyset,
      }
    }
    case "distance": {
      const dist = distanceSql(lat!, lng!)
      let keyset: Prisma.Sql | null = null
      if (matchingCursor?.kind === "distance") {
        keyset =
          matchingCursor.distance === null
            ? Prisma.sql`(${dist} IS NULL AND p.id > ${matchingCursor.id})`
            : Prisma.sql`((${dist} IS NOT NULL AND (${dist}, p.id) > (${matchingCursor.distance}::float8, ${matchingCursor.id}))
              OR ${dist} IS NULL)`
      }
      return {
        orderBy: Prisma.sql`${dist} ASC NULLS LAST, p.id ASC`,
        extraSelect: Prisma.sql`, ${dist} AS distance_km`,
        keyset,
      }
    }
    default: {
      const keyset =
        matchingCursor?.kind === "newest"
          ? Prisma.sql`(p.created_at, p.id) < (${matchingCursor.createdAt}::timestamptz, ${matchingCursor.id})`
          : null
      return {
        orderBy: Prisma.sql`p.created_at DESC, p.id DESC`,
        extraSelect: Prisma.empty,
        keyset,
      }
    }
  }
}

async function runSqlPaginated(
  filters: PlaceFilters,
  cursor: PlaceCursor | null,
  pageSize: number,
  buildConditionsFn: (f: PlaceFilters) => Prisma.Sql[],
): Promise<{ items: PlaceDto[]; next: PlaceCursor | null; total: number }> {
  const { orderBy, extraSelect, keyset } = buildSortClause(
    filters.sort,
    cursor,
    filters.lat,
    filters.lng,
  )
  const filterConditions = buildConditionsFn(filters)
  const conditions = keyset ? [...filterConditions, keyset] : filterConditions

  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<PlaceRow[]>(Prisma.sql`
      ${selectPlaces(extraSelect)}
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY ${orderBy}
      LIMIT ${pageSize + 1}
    `),
    prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM places p
      WHERE ${Prisma.join(filterConditions, " AND ")}
    `),
  ])

  const page = rows.slice(0, pageSize)
  const last = page.at(-1)
  const next = rows.length > pageSize && last ? cursorForSort(filters.sort, last) : null

  return { items: page.map(toPlaceDto), next, total: Number(countRows[0]?.count ?? 0) }
}

async function hasExactVenueName(q: string, baseConditions: Prisma.Sql[]): Promise<boolean> {
  const normalized = normalizeSearchText(q)
  if (!normalized) return false
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT p.id
    FROM places p
    WHERE ${Prisma.join(baseConditions, " AND ")}
      AND ${NAME_HAYSTACK} = immutable_search_normalize(${normalized})
    LIMIT 1
  `)
  return rows.length > 0
}

export async function listPlacesPaginated(
  filters: PlaceFilters,
  cursor: PlaceCursor | null,
  pageSize: number,
  buildConditionsFn: (f: PlaceFilters) => Prisma.Sql[],
): Promise<{
  items: PlaceDto[]
  next: PlaceCursor | null
  total: number
  relaxedFilters?: boolean
}> {
  const promotion = promotePlaceFilters(filters)

  // S-2 Pure-Intent SQL Fast-Path: khi query 100% bóc thành bộ lọc SQL cứng
  // và không trùng chính xác tên quán, chạy SQL index trực tiếp (< 3ms)
  // hỗ trợ đầy đủ mọi kiểu sort & cursor pagination vô hạn.
  if (filters.q && promotion.isPureSqlFastPath) {
    const baseConditions = buildConditionsFn({ ...filters, q: undefined })
    const exactMatch = await hasExactVenueName(filters.q, baseConditions)
    if (!exactMatch) {
      const fastPage = await runSqlPaginated(
        promotion.promotedFilters,
        cursor,
        pageSize,
        buildConditionsFn,
      )
      if (fastPage.total > 0 || cursor !== null) {
        return fastPage
      }
      // Nếu fast-path trả 0 trên trang 1 (vd tên quán bắt đầu bằng cụm đó ở quận khác), rơi về hybrid fallback.
      const fallback = await hybridSearch(
        filters as PlaceFilters & { q: string },
        buildConditionsFn,
      )
      if (fallback && fallback.items.length > 0) {
        const items = fallback.items.slice(0, HYBRID_MAX_RESULTS)
        return { items, next: null, total: items.length, relaxedFilters: true }
      }
      return fastPage
    }
  }

  if (filters.q && !cursor && filters.sort === "newest") {
    const hybrid = await hybridSearch(filters as PlaceFilters & { q: string }, buildConditionsFn)
    if (hybrid) {
      const items = hybrid.items.slice(0, HYBRID_MAX_RESULTS)
      return {
        items,
        next: null,
        total: items.length,
        ...(hybrid.relaxedFilters ? { relaxedFilters: true } : {}),
      }
    }
  }

  // Với sort=rating / sort=distance hoặc cursor > 1 khi có `q`, vẫn áp dụng promotedFilters
  // (bộ lọc cứng bóc từ q + residualQuery) thay vì ép `AND` tất cả từ quận/giá vào `HAYSTACK`.
  const sqlFilters =
    filters.q && promotion.hasPromotedConstraints ? promotion.promotedFilters : filters
  const page = await runSqlPaginated(sqlFilters, cursor, pageSize, buildConditionsFn)
  if (
    page.total === 0 &&
    !cursor &&
    filters.q &&
    promotion.hasPromotedConstraints &&
    sqlFilters !== filters
  ) {
    const relaxed = await runSqlPaginated(filters, cursor, pageSize, buildConditionsFn)
    return relaxed.total > 0 ? { ...relaxed, relaxedFilters: true } : relaxed
  }
  return page
}
