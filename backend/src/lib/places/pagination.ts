import { Prisma } from "../../../generated/prisma/client"
import { prisma } from "../prisma"
import { selectPlaces } from "./select"
import { toPlaceDto, type PlaceDto, type PlaceRow, type PlaceFilters } from "./types"
import { distanceSql } from "./spatial"
import { hybridSearch, HYBRID_MAX_RESULTS } from "../search/hybrid"
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

export async function listPlacesPaginated(
  filters: PlaceFilters,
  cursor: PlaceCursor | null,
  pageSize: number,
  buildConditionsFn: (f: PlaceFilters) => Prisma.Sql[],
  baseConditionsFn: () => Prisma.Sql[],
): Promise<{ items: PlaceDto[]; next: PlaceCursor | null; total: number }> {
  if (filters.q && !cursor && filters.sort === "newest") {
    const hybrid = await hybridSearch(filters as PlaceFilters & { q: string }, buildConditionsFn)
    if (hybrid) {
      const items = hybrid.items.slice(0, HYBRID_MAX_RESULTS)
      return { items, next: null, total: items.length }
    }
  }

  const { orderBy, extraSelect, keyset } = buildSortClause(
    filters.sort,
    cursor,
    filters.lat,
    filters.lng,
  )
  const conditions = [...buildConditionsFn(filters)]
  if (keyset) conditions.push(keyset)

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
      WHERE ${Prisma.join(baseConditionsFn(), " AND ")}
    `),
  ])

  const page = rows.slice(0, pageSize)
  const last = page.at(-1)
  const next = rows.length > pageSize && last ? cursorForSort(filters.sort, last) : null

  return { items: page.map(toPlaceDto), next, total: Number(countRows[0]?.count ?? 0) }
}
