export type PlaceCategory = "cafe" | "restaurant" | "street-food" | "bakery" | "dessert" | "bar"

export type PlaceStatus = "open" | "closed" | "unknown"

export interface Place {
  id: string
  name: string
  address: string
  city: string

  district?: string
  category: PlaceCategory
  tags: string[]
  rating: number
  reviewCount: number
  priceLevel: 1 | 2 | 3

  imageUrl?: string

  imageHeight: number

  lat?: number

  lng?: number

  status?: PlaceStatus

  description?: string

  openingHours?: string

  publishedAt: string | null
}

export interface PlaceSummary {
  id: string
  name: string
  address: string
  district?: string
  category: PlaceCategory

  imageUrl?: string
  isPublished: boolean
  lat?: number
  lng?: number
}

export interface PlaceSuggestion {
  place: PlaceSummary

  reason: string
}

export interface DailyPickWhy {

  matchPercent: number

  district?: string

  distanceKm: number | null

  openNow: boolean | null

  signals: string[]
}

export interface DailyPick {
  place: Place
  reason: string

  why?: DailyPickWhy
}

export interface DailyPicks {
  date: string

  items: DailyPick[]
}
