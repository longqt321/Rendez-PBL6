import { api } from "@/lib/axios"
import { placesQueryParams, type DiscoverFilters } from "./get-places"
import type { Place } from "../types/place"

/** Khung nhìn bản đồ (độ, WGS84). */
export interface MapBounds {
  minLat: number
  minLng: number
  maxLat: number
  maxLng: number
}

export interface MapPlacesPage {
  items: Place[]
  /** Tổng số địa điểm khớp trong khung (có thể lớn hơn `items` khi vượt chặn trên). */
  total: number
}

/**
 * `GET /places/map` — địa điểm trong khung nhìn, không phân trang.
 *
 * Bản đồ tự nạp theo vùng đang xem nên server lọc theo `bbox` thay vì trả trang
 * đầu của danh sách chung (trước đây bản đồ chỉ thấy đúng 9 địa điểm đầu).
 * Bộ lọc dùng chung `placesQueryParams` với `getPlaces` — một nguồn quy đổi duy nhất.
 */
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
