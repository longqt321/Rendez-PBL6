import { useInfiniteQuery } from "@tanstack/react-query"
import { getPlaces, type DiscoverFilters } from "../api/get-places"

export function discoverQueryKey(filters: DiscoverFilters) {
  return ["places", filters.category, filters.district ?? "all", filters.query] as const
}

export function useDiscoverPlaces(filters: DiscoverFilters) {
  return useInfiniteQuery({
    queryKey: discoverQueryKey(filters),
    queryFn: ({ pageParam, signal }) => getPlaces(filters, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
  })
}
