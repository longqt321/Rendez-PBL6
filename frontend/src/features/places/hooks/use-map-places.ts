import { keepPreviousData, skipToken, useQuery } from "@tanstack/react-query"
import { getMapPlaces, type MapBounds } from "../api/get-map-places"
import type { DiscoverFilters } from "../api/get-places"

const BBOX_GRID = 0.01

const BBOX_MARGIN = 0.2

export function snapBounds(bounds: MapBounds): MapBounds {
  const snap = (value: number) => Math.round(value / BBOX_GRID) * BBOX_GRID
  const latPad = (bounds.maxLat - bounds.minLat) * BBOX_MARGIN
  const lngPad = (bounds.maxLng - bounds.minLng) * BBOX_MARGIN
  const minLat = snap(bounds.minLat - latPad)
  const maxLat = snap(bounds.maxLat + latPad)
  const minLng = snap(bounds.minLng - lngPad)
  const maxLng = snap(bounds.maxLng + lngPad)
  // Khung suy biến (min == max sau khi làm tròn) sẽ lọc ra 0 kết quả — nới ít
  // nhất một ô lưới mỗi phía để luôn có vùng tra cứu.
  return {
    minLat: Math.min(minLat, maxLat - BBOX_GRID),
    maxLat: Math.max(maxLat, minLat + BBOX_GRID),
    minLng: Math.min(minLng, maxLng - BBOX_GRID),
    maxLng: Math.max(maxLng, minLng + BBOX_GRID),
  }
}

export function mapPlacesQueryKey(filters: DiscoverFilters, snapped: MapBounds | null) {
  const filterParts = [
    filters.category,
    filters.district ?? "all",
    filters.query,
    filters.priceMax ?? "all",
    filters.room,
  ] as const

  if (!snapped) {
    return ["places", "map", "fit", ...filterParts] as const
  }

  return [
    "places",
    "map",
    snapped.minLng,
    snapped.minLat,
    snapped.maxLng,
    snapped.maxLat,
    ...filterParts,
  ] as const
}

export function useMapPlaces(
  filters: DiscoverFilters,
  bounds: MapBounds | null,
  options?: { allowUnbounded?: boolean },
) {
  const snapped = bounds ? snapBounds(bounds) : null
  const allowUnbounded = options?.allowUnbounded === true
  const shouldFetch = snapped !== null || allowUnbounded

  return useQuery({
    queryKey: shouldFetch ? mapPlacesQueryKey(filters, snapped) : ["places", "map", "idle"],
    queryFn: shouldFetch ? ({ signal }) => getMapPlaces(filters, snapped, signal) : skipToken,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    placeholderData: keepPreviousData,
  })
}
