import { Prisma } from "../../generated/prisma/client"
import { type PlaceCursor } from "./cursor"
import { type PlaceFilters, type PlaceDto } from "./places/types"
import { listPlacesInMap } from "./places/spatial"
import { listPlacesPaginated } from "./places/pagination"
import { keywordCondition, searchCondition } from "./search"

export type { PlaceFilters, PlaceRow, PlaceDto } from "./places/types"
export { toPlaceDto } from "./places/types"
export { parsePlaceFilters } from "./places/filters"
export { selectPlaces } from "./places/select"
export { findPublicPlace, findPublicPlaceWithVersion, listSavedPlaces } from "./places/crud"
export { denseCandidates, fuseRrf, findDidYouMean } from "./search"

function buildConditions(filters: PlaceFilters): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`p.published_at IS NOT NULL`,
    Prisma.sql`p.status <> 'closed'`,
    Prisma.sql`p.deleted_at IS NULL`,
  ]

  if (filters.categoriesMatchNothing) conditions.push(Prisma.sql`FALSE`)
  if (filters.categories.length > 0) {
    conditions.push(
      Prisma.sql`p.category IN (${Prisma.join(
        filters.categories.map((value) => Prisma.sql`${value}::place_category`),
      )})`,
    )
  }
  if (filters.districts.length > 0) {
    conditions.push(Prisma.sql`p.district IN (${Prisma.join(filters.districts)})`)
  }
  if (filters.priceMax !== undefined) {
    conditions.push(Prisma.sql`p.price_level <= ${filters.priceMax}`)
  }
  if (filters.excludeCategories.length > 0) {
    conditions.push(
      Prisma.sql`p.category NOT IN (${Prisma.join(
        filters.excludeCategories.map((value) => Prisma.sql`${value}::place_category`),
      )})`,
    )
  }
  if (filters.excludeDistricts.length > 0) {
    conditions.push(
      Prisma.sql`(p.district IS NULL OR p.district NOT IN (${Prisma.join(filters.excludeDistricts)}))`,
    )
  }
  for (const keyword of filters.includeKeywords) {
    conditions.push(keywordCondition(keyword))
  }
  if (filters.excludeKeywords.length > 0) {
    conditions.push(
      Prisma.sql`NOT (${Prisma.join(filters.excludeKeywords.map(keywordCondition), " OR ")})`,
    )
  }
  if (filters.q) {
    conditions.push(searchCondition(filters.q))
  }
  if (filters.bbox) {
    conditions.push(
      Prisma.sql`p.lat IS NOT NULL AND p.lng IS NOT NULL
        AND p.lng BETWEEN ${filters.bbox.minLng} AND ${filters.bbox.maxLng}
        AND p.lat BETWEEN ${filters.bbox.minLat} AND ${filters.bbox.maxLat}`,
    )
  }

  return conditions
}

export async function listPlaces(
  filters: PlaceFilters,
  cursor: PlaceCursor | null,
  pageSize: number,
): Promise<{ items: PlaceDto[]; next: PlaceCursor | null; total: number }> {
  return listPlacesPaginated(filters, cursor, pageSize, buildConditions)
}

export async function listPlacesInMapWrapper(
  filters: PlaceFilters,
  limit: number,
): Promise<{ items: PlaceDto[]; total: number }> {
  return listPlacesInMap(filters, limit, buildConditions)
}

export { listPlacesInMapWrapper as listPlacesInMap }
