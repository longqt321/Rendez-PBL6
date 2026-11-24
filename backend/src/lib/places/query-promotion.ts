import { parseNaturalFilterQuery, type ParsedNaturalQuery } from "@rendez/schema"
import type { PlaceFilters } from "./types"

export interface QueryPromotionResult {
  parsed: ParsedNaturalQuery | null
  promotedFilters: PlaceFilters
  /** True khi toàn bộ câu truy vấn phân rã gọn về điều kiện SQL cứng (loại hình, quận, mức giá, loại trừ) và không còn từ khoá/tag/24-7 dư. */
  isPureSqlFastPath: boolean
  hasPromotedConstraints: boolean
}

export function promotePlaceFilters(filters: PlaceFilters): QueryPromotionResult {
  const rawQ = filters.q?.trim()
  if (!rawQ) {
    return {
      parsed: null,
      promotedFilters: filters,
      isPureSqlFastPath: false,
      hasPromotedConstraints: false,
    }
  }

  const parsed = parseNaturalFilterQuery(rawQ)
  const categories = filters.categories.length > 0 ? filters.categories : parsed.categories
  const districts = filters.districts.length > 0 ? filters.districts : parsed.districts
  const priceMax = filters.priceMax !== undefined ? filters.priceMax : parsed.priceMax
  const excludeCategories = [
    ...new Set([...filters.excludeCategories, ...parsed.excludeCategories]),
  ]
  const excludeDistricts = [...new Set([...filters.excludeDistricts, ...parsed.excludeDistricts])]
  const excludeKeywords = [...new Set([...filters.excludeKeywords, ...parsed.excludeKeywords])]
  const tags = [...new Set([...(filters.tags ?? []), ...parsed.tags])]
  const alwaysOpen = Boolean(filters.alwaysOpen || parsed.alwaysOpen)
  const landmarkQuery = filters.landmarkQuery || parsed.landmarkQuery

  const hasPromotedConstraints =
    (filters.categories.length === 0 && parsed.categories.length > 0) ||
    (filters.districts.length === 0 && parsed.districts.length > 0) ||
    (filters.priceMax === undefined && parsed.priceMax !== undefined) ||
    parsed.excludeCategories.length > 0 ||
    parsed.excludeDistricts.length > 0 ||
    parsed.excludeKeywords.length > 0 ||
    tags.length > 0 ||
    alwaysOpen ||
    Boolean(landmarkQuery)

  const isPureSqlFastPath = parsed.residualQuery.length === 0 && hasPromotedConstraints

  const promotedFilters: PlaceFilters = {
    ...filters,
    categories,
    districts,
    ...(priceMax !== undefined ? { priceMax } : {}),
    excludeCategories,
    excludeDistricts,
    excludeKeywords,
    ...(tags.length > 0 ? { tags } : {}),
    ...(alwaysOpen ? { alwaysOpen: true } : {}),
    ...(landmarkQuery ? { landmarkQuery } : {}),
    q: parsed.residualQuery.length > 0 ? parsed.residualQuery : undefined,
  }

  return {
    parsed,
    promotedFilters,
    isPureSqlFastPath,
    hasPromotedConstraints,
  }
}
