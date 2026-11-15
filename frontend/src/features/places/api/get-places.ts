import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { Place, PlaceCategory } from "../types/place"

export type DiscoverSort = "newest" | "rating" | "distance"

export interface DiscoverFilters {
  category: PlaceCategory | "all"

  district?: string
  query: string

  priceMax?: 1 | 2 | 3

  sort?: DiscoverSort

  coords?: { lat: number; lng: number }

  room?: {
    categories: PlaceCategory[]
    excludedCategories: PlaceCategory[]
    districts: string[]
    excludedDistricts: string[]
    includeKeywords: string[]
    excludeKeywords: string[]
    priceMax?: 1 | 2 | 3
  }
}

const joinList = (values: string[]): string | undefined =>
  values.length > 0 ? values.join(",") : undefined

export function placesQueryParams(filters: DiscoverFilters) {
  const room = filters.room
  return {
    // Khi có phòng: category/district lấy từ danh sách của phòng (nhiều phần
    // tử phân tách dấu phẩy), bỏ qua filter cá nhân trên URL.
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
    // Phòng có priceMax thì thắng filter giá cá nhân (thứ tự ưu tiên hiện có).
    priceMax: room?.priceMax ?? filters.priceMax,
    // `/places/map` bỏ qua sort phía server — gửi cũng vô hại, giữ một nguồn
    // dựng params duy nhất cho cả lưới lẫn bản đồ.
    sort: filters.sort && filters.sort !== "newest" ? filters.sort : undefined,
    lat: filters.sort === "distance" ? filters.coords?.lat : undefined,
    lng: filters.sort === "distance" ? filters.coords?.lng : undefined,
    excludeCategory: joinList(room?.excludedCategories ?? []),
    excludeDistrict: joinList(room?.excludedDistricts ?? []),
    includeKeyword: joinList(room?.includeKeywords ?? []),
    excludeKeyword: joinList(room?.excludeKeywords ?? []),
  }
}

export async function getPlaces(
  filters: DiscoverFilters,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<Page<Place>> {
  const { data } = await api.get<Page<Place>>("/places", {
    params: {
      cursor: cursor ?? undefined,
      ...placesQueryParams(filters),
    },
    signal,
  })
  return data
}
