import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { Review } from "../types/review"

/** `GET /places/:id/reviews` — danh sách đánh giá của địa điểm, mới nhất trước. */
export async function getPlaceReviews(placeId: string, signal?: AbortSignal): Promise<Review[]> {
  const { data } = await api.get<Page<Review>>(`/places/${placeId}/reviews`, { signal })
  return data.items
}
