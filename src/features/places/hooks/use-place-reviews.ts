import { useQuery } from "@tanstack/react-query"
import { getPlaceReviews } from "../api/get-place-reviews"

export function placeReviewsQueryKey(id: string) {
  return ["places", id, "reviews"] as const
}

/** Đánh giá của địa điểm — danh sách phẳng, mới nhất trước. */
export function usePlaceReviews(id: string) {
  return useQuery({
    queryKey: placeReviewsQueryKey(id),
    queryFn: ({ signal }) => getPlaceReviews(id, signal),
    placeholderData: (previous) => previous,
  })
}
