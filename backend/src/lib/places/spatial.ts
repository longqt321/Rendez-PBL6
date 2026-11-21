import { Prisma } from "../../../generated/prisma/client"
import { prisma } from "../prisma"
import { selectPlaces } from "./select"
import { promotePlaceFilters } from "./query-promotion"
import { toPlaceDto, type PlaceDto, type PlaceRow, type PlaceFilters } from "./types"
import { hybridSearch, HYBRID_POOL } from "../search/hybrid"
import { NAME_HAYSTACK } from "../search/name-matcher"
import { normalizeSearchText } from "../search-synonyms"

export function distanceSql(lat: number, lng: number): Prisma.Sql {
  return Prisma.sql`(6371 * acos(least(1, greatest(-1,
    cos(radians(${lat})) * cos(radians(p.lat)) * cos(radians(p.lng) - radians(${lng}))
    + sin(radians(${lat})) * sin(radians(p.lat))
  ))))`
}

async function runMapSql(
  filters: PlaceFilters,
  limit: number,
  buildConditionsFn: (f: PlaceFilters) => Prisma.Sql[],
): Promise<{ items: PlaceDto[]; total: number }> {
  const conditions = buildConditionsFn(filters)
  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<PlaceRow[]>(Prisma.sql`
      ${selectPlaces()}
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ${limit}
    `),
    prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM places p
      WHERE ${Prisma.join(conditions, " AND ")}
    `),
  ])

  return { items: rows.map(toPlaceDto), total: Number(countRows[0]?.count ?? 0) }
}

export async function listPlacesInMap(
  filters: PlaceFilters,
  limit: number,
  buildConditionsFn: (f: PlaceFilters) => Prisma.Sql[],
): Promise<{ items: PlaceDto[]; total: number; relaxedFilters?: boolean }> {
  const promotion = promotePlaceFilters(filters)

  if (filters.q && promotion.isPureSqlFastPath) {
    const baseConditions = buildConditionsFn({ ...filters, q: undefined })
    const norm = normalizeSearchText(filters.q)
    const exactRows = norm
      ? await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
          SELECT p.id FROM places p
          WHERE ${Prisma.join(baseConditions, " AND ")}
            AND ${NAME_HAYSTACK} = immutable_search_normalize(${norm})
          LIMIT 1
        `)
      : []
    if (exactRows.length === 0) {
      const fastMap = await runMapSql(promotion.promotedFilters, limit, buildConditionsFn)
      if (fastMap.total > 0) return fastMap
    }
  }

  if (filters.q) {
    const hybrid = await hybridSearch(
      filters as PlaceFilters & { q: string },
      buildConditionsFn,
      Math.max(HYBRID_POOL, limit),
    )
    if (hybrid) {
      return {
        items: hybrid.items.slice(0, limit),
        total: hybrid.total,
        ...(hybrid.relaxedFilters ? { relaxedFilters: true } : {}),
      }
    }
  }

  return runMapSql(filters, limit, buildConditionsFn)
}
