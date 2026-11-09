import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { Place } from "@/features/places/types/place"

/**
 * `GET /places/saved` — địa điểm đã lưu của người dùng hiện tại.
 *
 * "Đã lưu" nghĩa là địa điểm nằm trong ít nhất một bộ sưu tập của chính mình;
 * server gộp và loại trùng, client chỉ render.
 */
export async function getSavedPlaces(signal?: AbortSignal): Promise<Place[]> {
  const { data } = await api.get<Page<Place>>("/places/saved", { signal })
  return data.items
}
