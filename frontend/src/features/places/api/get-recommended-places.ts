import { api } from "@/lib/axios"
import { getAnonId } from "@/lib/events"
import type { Page } from "@/types/api"
import type { Place } from "../types/place"

/**
 * `GET /places/recommended` — gợi ý cá nhân hoá theo lịch sử tương tác.
 *
 * Guest chưa đăng nhập vẫn có affinity: BE nhận `anonId` (cùng id mà
 * `emitPlaceClick` gắn cho event) để tra `interaction_events`. Thiếu tham số
 * này thì mọi khách rơi về cold-start.
 *
 * Endpoint lỗi bất kỳ (404, 401, mạng) → trả `[]`: dải "Gợi ý cho bạn" tự thu
 * gọn, không làm hỏng trang chính.
 *
 * Item cùng shape với `GET /places` để dùng lại `PlaceCard` có sẵn.
 */
export async function getRecommendedPlaces(limit = 6, signal?: AbortSignal): Promise<Place[]> {
  try {
    const anonId = getAnonId()
    const { data } = await api.get<Page<Place>>("/places/recommended", {
      params: anonId === undefined ? { limit } : { limit, anonId },
      signal,
    })
    return data.items
  } catch {
    // 404 (endpoint chưa có), 401 hay lỗi mạng đều coi là "chưa có gợi ý".
    return []
  }
}
