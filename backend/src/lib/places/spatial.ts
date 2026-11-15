import { Prisma } from "../../../generated/prisma/client"
import { prisma } from "../prisma"
import { selectPlaces } from "./select"
import { toPlaceDto, type PlaceDto, type PlaceRow, type PlaceFilters } from "./types"
import { hybridSearch } from "../search/hybrid"

export function distanceSql(lat: number, lng: number): Prisma.Sql {
  return Prisma.sql`(6371 * acos(least(1, greatest(-1,
    cos(radians(${lat})) * cos(radians(p.lat)) * cos(radians(p.lng) - radians(${lng}))
    + sin(radians(${lat})) * sin(radians(p.lat))
  ))))`
}

export async function listPlacesInMap(
  filters: PlaceFilters,
  limit: number,
  buildConditionsFn: (f: PlaceFilters) => Prisma.Sql[],
): Promise<{ items: PlaceDto[]; total: number }> {
  if (filters.q) {
    const hybrid = await hybridSearch(filters as PlaceFilters & { q: string }, buildConditionsFn)
    if (hybrid) return { items: hybrid.items.slice(0, limit), total: hybrid.total }
  }

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
