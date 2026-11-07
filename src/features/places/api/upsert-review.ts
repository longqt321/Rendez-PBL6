import { api } from "@/lib/axios"
import type { Review } from "../types/review"

export interface UpsertReviewInput {
  /** Số nguyên 1–5. */
  rating: number
  /** Nội dung text — form không nhận ảnh hay file đính kèm. */
  content: string
}

/** `POST /places/:id/reviews` — tạo hoặc ghi đè đánh giá của người dùng hiện tại. */
export async function upsertReview(placeId: string, input: UpsertReviewInput): Promise<Review> {
  const { data } = await api.post<Review>(`/places/${placeId}/reviews`, input)
  return data
}
