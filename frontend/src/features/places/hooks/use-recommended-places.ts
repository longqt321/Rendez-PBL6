import { useQuery } from "@tanstack/react-query"
import { getRecommendedPlaces } from "../api/get-recommended-places"

export function useRecommendedPlaces(limit = 6) {
  return useQuery({
    queryKey: ["recommended-places", limit],
    queryFn: ({ signal }) => getRecommendedPlaces(limit, signal),
    staleTime: 5 * 60_000,
    retry: 1,
  })
}
