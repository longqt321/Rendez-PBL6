import { useMutation, useQueryClient } from "@tanstack/react-query"
import { upsertReview } from "../api/upsert-review"
import type { UpsertReviewInput } from "../api/upsert-review"
import type { Review } from "../types/review"

/**
 * Gửi đánh giá (tạo mới hoặc ghi đè đánh giá cũ của chính người dùng).
 *
 * Server là nguồn sự thật — sau khi xác nhận, thay bản ghi của người dùng trong
 * cache rồi làm mới lại query để đảm bảo khớp.
 */
export function useUpsertReview(placeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpsertReviewInput) => upsertReview(placeId, input),
    onSuccess: (review: Review) => {
      queryClient.setQueryData<Review[]>(["places", placeId, "reviews"], (items) => {
        if (!items) return [review]
        return [review, ...items.filter((item) => item.id !== review.id)]
      })
    },
    onSettled: () => {
      // Prefix `["places"]` làm mới cả trang chi tiết lẫn danh sách discover
      // (thẻ quán hiện điểm đánh giá) — một nguồn dữ liệu, cùng cập nhật.
      void queryClient.invalidateQueries({ queryKey: ["places"] })
    },
  })
}
