import { api } from "@/lib/axios"
import { idempotencyHeaders } from "@/lib/idempotency"
import type { Review, UpsertReviewInput } from "@rendez/schema"

export type { UpsertReviewInput }

export async function upsertReview(placeId: string, input: UpsertReviewInput): Promise<Review> {
  const { data } = await api.post<Review>(`/places/${placeId}/reviews`, input, {
    headers: idempotencyHeaders(),
  })
  return data
}
