import { useInfiniteQuery } from "@tanstack/react-query"
import { getPlacePosts } from "../api/get-place-detail"

export function placePostsQueryKey(id: string) {
  return ["places", id, "posts"] as const
}

export function usePlacePosts(id: string) {
  return useInfiniteQuery({
    queryKey: placePostsQueryKey(id),
    queryFn: ({ pageParam, signal }) => getPlacePosts(id, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
  })
}
