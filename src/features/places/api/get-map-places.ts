import { api } from "@/lib/axios"
import type { DiscoverFilters } from "./get-places"
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

const joinList = (values: string[]): string | undefined =>
  values.length > 0 ? values.join(",") : undefined

/**
 * `GET /places/map` — địa điểm trong khung nhìn, không phân trang.
 *
 * Bản đồ tự nạp theo vùng đang xem nên server lọc theo `bbox` thay vì trả trang
 * đầu của danh sách chung (trước đây bản đồ chỉ thấy đúng 9 địa điểm đầu).
 */
export async function getMapPlaces(
  filters: DiscoverFilters,
  bounds: MapBounds,
  signal?: AbortSignal,
): Promise<MapPlacesPage> {
  const room = filters.room
  const { data } = await api.get<MapPlacesPage>("/places/map", {
    params: {
      bbox: [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat].join(","),
      category: room
        ? joinList(room.categories)
        : filters.category === "all"
          ? undefined
          : filters.category,
      district: room
        ? joinList(room.districts)
        : filters.district && filters.district !== "all"
          ? filters.district
          : undefined,
      q: room ? undefined : filters.query.trim() || undefined,
      priceMax: room?.priceMax,
      excludeCategory: joinList(room?.excludedCategories ?? []),
      excludeDistrict: joinList(room?.excludedDistricts ?? []),
      includeKeyword: joinList(room?.includeKeywords ?? []),
      excludeKeyword: joinList(room?.excludeKeywords ?? []),
    },
    signal,
  })
  return data
}
