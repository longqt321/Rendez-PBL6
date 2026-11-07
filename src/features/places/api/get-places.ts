import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { Place, PlaceCategory } from "../types/place"

export interface DiscoverFilters {
  category: PlaceCategory | "all"
  query: string
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
      category: filters.category === "all" ? undefined : filters.category,
      q: filters.query.trim() || undefined,
    },
    signal,
  })
  return data
}
