import { useInfiniteQuery } from "@tanstack/react-query"
import { useAppStore } from "@/stores/app-store"
import { getDiscoverPage, type DiscoverFilters } from "../api/get-places"

export function discoverQueryKey(filters: DiscoverFilters, publishedIds: string[]) {
  return ["discover", filters.category, filters.query, publishedIds.join(",")] as const
}

export function useDiscoverPlaces(filters: DiscoverFilters) {
  const publishedPlaceIds = useAppStore((state) => state.publishedPlaceIds)

  return useInfiniteQuery({
    queryKey: discoverQueryKey(filters, publishedPlaceIds),
    queryFn: ({ pageParam, signal }) =>
      getDiscoverPage(filters, publishedPlaceIds, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    // Dữ liệu mock là tĩnh: không cần refetch khi focus lại cửa sổ.
    staleTime: Number.POSITIVE_INFINITY,
  })
}
