import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { Place } from "../types/place"

/**
 * `GET /places/recommended` — gợi ý cá nhân hoá theo lịch sử tương tác.
 *
 * Endpoint do backend bổ sung sau (agent khác đang làm song song), nên khi chưa
 * tồn tại (404) hoặc lỗi bất kỳ, hàm trả `[]` — dải "Gợi ý cho bạn" tự thu gọn,
 * không làm hỏng trang chính.
 *
 * Item cùng shape với `GET /places` để dùng lại `PlaceCard` có sẵn.
 */
export async function getRecommendedPlaces(limit = 6, signal?: AbortSignal): Promise<Place[]> {
  try {
    const { data } = await api.get<Page<Place>>("/places/recommended", {
      params: { limit },
      signal,
    })
    return data.items
  } catch {
    // 404 (endpoint chưa có), 401 hay lỗi mạng đều coi là "chưa có gợi ý".
    return []
  }
}
