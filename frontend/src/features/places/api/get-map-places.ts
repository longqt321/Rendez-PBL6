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
  bounds: MapBounds,
  signal?: AbortSignal,
): Promise<MapPlacesPage> {
  const { data } = await api.get<MapPlacesPage>("/places/map", {
    params: {
      bbox: [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat].join(","),
      ...placesQueryParams(filters),
    },
    signal,
  })
  return data
}
