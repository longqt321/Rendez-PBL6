import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { voteReviewHelpful } from "../api/vote-review-helpful"

export function useVoteReviewHelpful(placeId: string, reviewId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => voteReviewHelpful(reviewId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["places", placeId, "reviews"] })
    },
    onError: () => {
      toast.error("Không thể ghi nhận bình chọn hữu ích")
    },
  })
}
