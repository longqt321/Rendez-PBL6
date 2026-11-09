import { useInfiniteQuery } from "@tanstack/react-query"
import { getPosts, type GetPostsParams } from "../api/get-posts"

export function postsQueryKey({ filter, q }: GetPostsParams) {
  return ["posts", filter, q?.trim() || ""] as const
}

/**
 * Feed cộng đồng, phân trang theo cursor.
 *
 * Server lọc theo `filter`/`q` và phân trang; client không tự lọc dữ liệu đã tải.
 * Dùng `useInfinitePosts()` để lấy mảng phẳng các bài đã tải.
 */
export function usePostsQuery(params: GetPostsParams) {
  return useInfiniteQuery({
    queryKey: postsQueryKey(params),
    queryFn: ({ pageParam, signal }) => getPosts(params, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
  })
}

/** Danh sách bài đã tải của feed — phẳng hoá các trang server trả về. */
export function usePosts(params: GetPostsParams) {
  const query = usePostsQuery(params)
  return {
    ...query,
    posts: query.data?.pages.flatMap((page) => page.items) ?? [],
  }
}
