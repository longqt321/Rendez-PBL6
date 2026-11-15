import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { Review } from "../types/review"

export async function getPlaceReviews(placeId: string, signal?: AbortSignal): Promise<Review[]> {
  const { data } = await api.get<Page<Review>>(`/places/${placeId}/reviews`, { signal })
  return data.items
}
