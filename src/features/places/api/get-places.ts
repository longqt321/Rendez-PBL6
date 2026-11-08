import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { Place, PlaceCategory } from "../types/place"

export interface DiscoverFilters {
  category: PlaceCategory | "all"
  /** `"all"` = không lọc quận (khi gọi API thì bỏ trống tham số). */
  district?: string
  query: string
  /**
   * Ràng buộc của phòng lọc nhóm — server lọc trước khi phân trang nên kết quả
   * của mọi thành viên giống hệt nhau. Giá trị nhiều phần tử phân tách bằng
   * dấu phẩy; bỏ trống khi không có phòng.
   */
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

/**
 * `GET /places` — danh sách địa điểm đã được duyệt lên /discover.
 *
 * Server lo việc lọc và phân trang; client chỉ chuyền lại `cursor` mà server trả về.
 */
export async function getPlaces(
  filters: DiscoverFilters,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<Page<Place>> {
  const room = filters.room
  const { data } = await api.get<Page<Place>>("/places", {
    params: {
      cursor: cursor ?? undefined,
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
