import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { deleteReview } from "../api/delete-review"
import type { Review } from "../types/review"

/**
 * Xoá đánh giá của chính người dùng hiện tại tại địa điểm.
 *
 * Invalidate các queries liên quan:
 * - `["places", placeId, "reviews"]`
 * - `["places", placeId]` (và tiền tố `["places"]` để làm mới danh sách / rating quán).
 */
export function useDeleteReview(placeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => deleteReview(placeId),
    onSuccess: () => {
      // Xoá review của chính mình ra khỏi cache danh sách reviews ngay lập tức
      queryClient.setQueryData<Review[]>(["places", placeId, "reviews"], (items) => {
        if (!items) return []
        return items.filter((item) => !item.isMine)
      })
      toast.success("Đã xoá đánh giá")
    },
    onError: () => {
      toast.error("Không xoá được đánh giá, thử lại nhé")
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["places", placeId, "reviews"] })
      void queryClient.invalidateQueries({ queryKey: ["places", placeId] })
      void queryClient.invalidateQueries({ queryKey: ["places"] })
    },
  })
}
