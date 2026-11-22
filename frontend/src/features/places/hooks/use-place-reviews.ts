import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { getPlaceReviews } from "../api/get-place-reviews"

export function placeReviewsQueryKey(id: string) {
  return ["places", id, "reviews"] as const
}

export function usePlaceReviews(id: string) {
  return useQuery({
    queryKey: placeReviewsQueryKey(id),
    queryFn: ({ signal }) => getPlaceReviews(id, signal),
    placeholderData: keepPreviousData,
  })
}
