import { keepPreviousData, skipToken, useQuery } from "@tanstack/react-query"
import { getMapPlaces, type MapBounds } from "../api/get-map-places"
import type { DiscoverFilters } from "../api/get-places"

/**
 * Lưới làm tròn khung nhìn (độ). 0,01° ≈ 1,1 km — kéo bản đồ một đoạn ngắn
 * không làm đổi khoá cache, nên lướt qua lại giữa hai vùng không gọi lại API.
 */
const BBOX_GRID = 0.01

/**
 * Nới khung nhìn thêm 20% mỗi phía để pin ở sát mép vẫn có sẵn trước khi người
 * dùng kéo tới — tránh cảm giác pin "hiện ra chậm" ở rìa.
 */
const BBOX_MARGIN = 0.2

/** Khung nhìn đã làm tròn + nới — dùng làm khoá cache. */
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

/** Khoá cache: khung đã làm tròn + toàn bộ bộ lọc (đổi lọc là đổi kết quả). */
export function mapPlacesQueryKey(filters: DiscoverFilters, snapped: MapBounds) {
  return [
    "places",
    "map",
    snapped.minLng,
    snapped.minLat,
    snapped.maxLng,
    snapped.maxLat,
    filters.category,
    filters.district ?? "all",
    filters.query,
    filters.room,
  ] as const
}

/**
 * Địa điểm trong khung nhìn bản đồ.
 *
 * Cache do TanStack Query lo (không tự viết): `staleTime` 5 phút + khoá theo
 * khung đã làm tròn ⇒ kéo qua kéo lại một vùng dùng lại cache, không gọi lại
 * server. `placeholderData: keepPreviousData` giữ pin cũ trong lúc tải vùng mới
 * nên bản đồ không bị "nhấp nháy trắng" khi pan.
 *
 * Chưa có khung nhìn (lúc mới mount) thì `queryFn = skipToken` — API chính thức
 * của TanStack Query để "không chạy query", thay cho việc assert `bounds!`.
 */
export function useMapPlaces(filters: DiscoverFilters, bounds: MapBounds | null) {
  const snapped = bounds ? snapBounds(bounds) : null

  return useQuery({
    queryKey: snapped ? mapPlacesQueryKey(filters, snapped) : ["places", "map", "idle"],
    queryFn: snapped ? ({ signal }) => getMapPlaces(filters, snapped, signal) : skipToken,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    placeholderData: keepPreviousData,
  })
}
