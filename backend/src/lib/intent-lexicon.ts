import {
  DANANG_DISTRICTS_CANONICAL,
  parseNaturalFilterQuery,
  type PlaceCategory,
} from "@rendez/schema"

export interface IntentAttributes {
  tags: string[]
  categories: PlaceCategory[]
  excludeCategories: PlaceCategory[]
  districts: string[]
  excludeDistricts: string[]
  excludeKeywords: string[]
  priceMax?: 1 | 2 | 3
  alwaysOpen: boolean
  nearMe: boolean
  residualQuery: string
}

export const DISTRICT_NAMES = DANANG_DISTRICTS_CANONICAL

export function extractMatchedPhrases(query: string): string[] {
  return parseNaturalFilterQuery(query).matchedPhrases
}

export function detectIntentAttributes(query: string): IntentAttributes {
  const parsed = parseNaturalFilterQuery(query)
  return {
    tags: parsed.tags,
    categories: parsed.categories,
    excludeCategories: parsed.excludeCategories,
    districts: parsed.districts,
    excludeDistricts: parsed.excludeDistricts,
    excludeKeywords: parsed.excludeKeywords,
    ...(parsed.priceMax !== undefined ? { priceMax: parsed.priceMax } : {}),
    alwaysOpen: parsed.alwaysOpen,
    nearMe: parsed.nearMe,
    residualQuery: parsed.residualQuery,
  }
}
