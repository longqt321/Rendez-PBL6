import { useInfiniteQuery } from "@tanstack/react-query"
import { getPlaces, type DiscoverFilters } from "../api/get-places"

export function discoverQueryKey(filters: DiscoverFilters) {
  // `room` phải nằm trong key: đổi ràng buộc phòng phải fetch lại, không dùng
  // cache của kết quả trước đó.
  return [
    "places",
    filters.category,
    filters.district ?? "all",
    filters.query,
    filters.room,
  ] as const
}

export function useDiscoverPlaces(filters: DiscoverFilters) {
  return useInfiniteQuery({
    queryKey: discoverQueryKey(filters),
    queryFn: ({ pageParam, signal }) => getPlaces(filters, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
  })
}
