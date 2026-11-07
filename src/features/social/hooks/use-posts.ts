import { useQuery } from "@tanstack/react-query"
import { getPosts } from "../api/get-posts"
import type { PostFeedFilter } from "../types/post"

export function postsQueryKey(filter: PostFeedFilter) {
  return ["posts", filter] as const
}

/** Feed cộng đồng. Server lọc theo `filter`; client không tự lọc dữ liệu đã tải. */
export function usePosts(filter: PostFeedFilter) {
  return useQuery({
    queryKey: postsQueryKey(filter),
    queryFn: ({ signal }) => getPosts(filter, signal),
  })
}
