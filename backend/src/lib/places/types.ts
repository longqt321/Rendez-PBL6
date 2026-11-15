import { toApiCategory } from "../enums"
import type { PlaceSort } from "../cursor"
import type { PlaceCategory } from "@rendez/schema"

export interface PlaceFilters {
  q?: string
  categories: PlaceCategory[]
  categoriesMatchNothing: boolean
  districts: string[]
  priceMax?: number
  excludeCategories: PlaceCategory[]
  excludeDistricts: string[]
  includeKeywords: string[]
  excludeKeywords: string[]
  bbox?: { minLng: number; minLat: number; maxLng: number; maxLat: number }
  sort: PlaceSort
  lat?: number
  lng?: number
}

export interface PlaceRow {
  id: string
  name: string
  address: string
  city: string
  district: string | null
  category: string
  tags: string[]
  price_level: number
  lat: number | null
  lng: number | null
  status: string
  description: string | null
  opening_hours: string | null
  published_at: Date | null
  rating: number
  review_count: number
  image_url: string | null
  image_height: number | null
  created_at: Date
  distance_km?: number | null
}

export function toPlaceDto(row: PlaceRow) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    ...(row.district ? { district: row.district } : {}),
    category: toApiCategory(row.category),
    tags: row.tags,
    rating: Number(row.rating),
    reviewCount: Number(row.review_count),
    priceLevel: row.price_level,
    ...(row.image_url ? { imageUrl: row.image_url } : {}),
    imageHeight: row.image_height ?? 320,
    ...(row.lat !== null ? { lat: row.lat } : {}),
    ...(row.lng !== null ? { lng: row.lng } : {}),
    status: row.status,
    ...(row.description ? { description: row.description } : {}),
    ...(row.opening_hours ? { openingHours: row.opening_hours } : {}),
    publishedAt: row.published_at ? row.published_at.toISOString() : null,
  }
}

export type PlaceDto = ReturnType<typeof toPlaceDto>
