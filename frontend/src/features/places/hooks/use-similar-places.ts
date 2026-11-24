import { useQuery } from "@tanstack/react-query"
import { getSimilarPlaces } from "../api/get-similar-places"

export function useSimilarPlaces(placeId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["places", placeId, "similar"],
    queryFn: ({ signal }) => getSimilarPlaces(placeId, signal),
    staleTime: 60_000,
    enabled: Boolean(placeId) && (options?.enabled ?? true),
  })
}
