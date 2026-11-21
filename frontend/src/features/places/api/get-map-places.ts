import { api } from "@/lib/axios"
import { placesQueryParams, type DiscoverFilters } from "./get-places"
import type { Place } from "../types/place"

export interface MapBounds {
  minLat: number
  minLng: number
  maxLat: number
  maxLng: number
}

export interface MapPlacesPage {
  items: Place[]

  total: number
}

export async function getMapPlaces(
  filters: DiscoverFilters,
  bounds: MapBounds | null,
  signal?: AbortSignal,
): Promise<MapPlacesPage> {
  const params = placesQueryParams(filters)
  const { data } = await api.get<MapPlacesPage>("/places/map", {
    params: {
      ...(bounds
        ? { bbox: [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat].join(",") }
        : {}),
      category: params.category,
      district: params.district,
      q: params.q,
      priceMax: params.priceMax,
      excludeCategory: params.excludeCategory,
      excludeDistrict: params.excludeDistrict,
      includeKeyword: params.includeKeyword,
      excludeKeyword: params.excludeKeyword,
    },
    signal,
  })
  return data
}
