import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"
import { getPosts, type GetPostsParams } from "../api/get-posts"

export function postsQueryKey({ filter, q }: GetPostsParams) {
  return ["posts", filter, q?.trim() || ""] as const
}

export function usePostsQuery(params: GetPostsParams) {
  return useInfiniteQuery({
    queryKey: postsQueryKey(params),
    queryFn: ({ pageParam, signal }) => getPosts(params, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
    placeholderData: keepPreviousData,
  })
}

export function usePosts(params: GetPostsParams) {
  const query = usePostsQuery(params)
  return {
    ...query,
    posts: query.data?.pages.flatMap((page) => page.items) ?? [],
  }
}
