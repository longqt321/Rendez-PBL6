import { api } from "@/lib/axios"

/**
 * `DELETE /places/:id/reviews` — xoá đánh giá của chính người dùng hiện tại (204 No Content).
 */
export async function deleteReview(placeId: string, signal?: AbortSignal): Promise<void> {
  await api.delete(`/places/${placeId}/reviews`, { signal })
}
