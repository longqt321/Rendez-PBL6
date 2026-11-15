import { api } from "@/lib/axios"

export async function deleteReview(placeId: string, signal?: AbortSignal): Promise<void> {
  await api.delete(`/places/${placeId}/reviews`, { signal })
}
