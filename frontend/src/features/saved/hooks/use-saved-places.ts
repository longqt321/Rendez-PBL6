import { useInfiniteQuery } from "@tanstack/react-query"
import { getSavedPlaces } from "../api/get-saved-places"

export const savedPlacesQueryKey = ["places", "saved"] as const

export function useSavedPlacesQuery() {
  return useInfiniteQuery({
    queryKey: savedPlacesQueryKey,
    queryFn: ({ pageParam, signal }) => getSavedPlaces(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
  })
}

export function useSavedPlaces() {
  const query = useSavedPlacesQuery()
  return {
    ...query,
    places: query.data?.pages.flatMap((page) => page.items) ?? [],
  }
}
