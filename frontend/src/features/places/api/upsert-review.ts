import { api } from "@/lib/axios"
import { idempotencyHeaders } from "@/lib/idempotency"
import type { Review } from "../types/review"

export interface UpsertReviewInput {
  rating: number

  content: string
}

export async function upsertReview(placeId: string, input: UpsertReviewInput): Promise<Review> {
  const { data } = await api.post<Review>(`/places/${placeId}/reviews`, input, {
    headers: idempotencyHeaders(),
  })
  return data
}
