import { useQuery } from "@tanstack/react-query"
import { getPosts, type GetPostsParams } from "../api/get-posts"

export function postsQueryKey({ filter, q }: GetPostsParams) {
  return ["posts", filter, q?.trim() || ""] as const
}

/** Feed cộng đồng. Server lọc theo `filter` và `q`; client không tự lọc dữ liệu đã tải. */
export function usePosts(params: GetPostsParams) {
  return useQuery({
    queryKey: postsQueryKey(params),
    queryFn: ({ signal }) => getPosts(params, signal),
  })
}
