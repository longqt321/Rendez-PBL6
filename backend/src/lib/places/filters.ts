import { parseApiCategory } from "../enums"
import type { PlaceFilters } from "./types"
import type { PlaceCategory } from "@rendez/schema"
import type { PlaceSort } from "../cursor"

export function splitList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value !== "all")
}

export function parseCategoryList(raw: string | undefined): {
  categories: PlaceCategory[]
  unmatchedOnly: boolean
} {
  const rawValues = splitList(raw)
  const categories: PlaceCategory[] = []
  for (const value of rawValues) {
    const category = parseApiCategory(value)
    if (category) categories.push(category)
  }
  return { categories, unmatchedOnly: rawValues.length > 0 && categories.length === 0 }
}

export function parsePlaceFilters(query: Record<string, string | undefined>): PlaceFilters {
  const priceMaxRaw = Number(query.priceMax)
  const priceMax =
    query.priceMax && Number.isFinite(priceMaxRaw) && priceMaxRaw >= 1 && priceMaxRaw <= 3
      ? priceMaxRaw
      : undefined

  const bboxParts = (query.bbox ?? "").split(",").map(Number)
  const bbox =
    bboxParts.length === 4 && bboxParts.every((value) => Number.isFinite(value))
      ? {
          minLng: bboxParts[0]!,
          minLat: bboxParts[1]!,
          maxLng: bboxParts[2]!,
          maxLat: bboxParts[3]!,
        }
      : undefined

  const category = parseCategoryList(query.category)
  const rawSort = query.sort
  const requestedSort: PlaceSort =
    rawSort === "rating" || rawSort === "distance" ? rawSort : "newest"

  const latRaw = Number(query.lat)
  const lngRaw = Number(query.lng)
  const hasCoords =
    query.lat !== undefined &&
    query.lng !== undefined &&
    Number.isFinite(latRaw) &&
    Number.isFinite(lngRaw) &&
    latRaw >= -90 &&
    latRaw <= 90 &&
    lngRaw >= -180 &&
    lngRaw <= 180

  const sort: PlaceSort = requestedSort === "distance" && !hasCoords ? "newest" : requestedSort

  return {
    q: query.q?.trim() || undefined,
    categories: category.categories,
    categoriesMatchNothing: category.unmatchedOnly,
    districts: splitList(query.district),
    priceMax,
    excludeCategories: parseCategoryList(query.excludeCategory).categories,
    excludeDistricts: splitList(query.excludeDistrict),
    includeKeywords: splitList(query.includeKeyword),
    excludeKeywords: splitList(query.excludeKeyword),
    bbox,
    sort,
    ...(sort === "distance" ? { lat: latRaw, lng: lngRaw } : {}),
  }
}
