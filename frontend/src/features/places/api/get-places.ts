import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { Place, PlaceCategory } from "../types/place"

/** Kiểu sắp xếp của `/discover` — khớp hợp đồng `GET /places` (sort/lat/lng). */
export type DiscoverSort = "newest" | "rating" | "distance"

export interface DiscoverFilters {
  category: PlaceCategory | "all"
  /** `"all"` = không lọc quận (khi gọi API thì bỏ trống tham số). */
  district?: string
  query: string
  /**
   * Mức giá tối đa của cá nhân (1–3). Phòng lọc nhóm có `priceMax` riêng và
   * LUÔN thắng filter cá nhân (xem `placesQueryParams`).
   */
  priceMax?: 1 | 2 | 3
  /** Kiểu sắp xếp — bỏ trống = `newest`. */
  sort?: DiscoverSort
  /**
   * Toạ độ người dùng cho `sort=distance`. Chỉ gửi khi có vị trí; server thiếu
   * toạ độ sẽ rơi về `newest` (không lỗi).
   */
  coords?: { lat: number; lng: number }
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
 * Dựng query params server từ bộ lọc — nguồn duy nhất cho cả danh sách lưới
 * (`getPlaces`) lẫn bản đồ (`getMapPlaces`) nên hai màn hình không bao giờ lệch
 * cách quy đổi bộ lọc (đặc biệt là ràng buộc phòng).
 */
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
  const { data } = await api.get<Page<Place>>("/places", {
    params: {
      cursor: cursor ?? undefined,
      ...placesQueryParams(filters),
    },
    signal,
  })
  return data
}
