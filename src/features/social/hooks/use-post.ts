import { useQuery } from "@tanstack/react-query"
import { getPost } from "../api/get-post"

/**
 * Khoá cache chi tiết bài đăng.
 *
 * Nằm dưới tiền tố `["posts"]` để mọi lần invalidate feed cũng làm mới trang chi tiết,
 * nhưng có thêm đoạn `"detail"` để không trùng khoá với danh sách `["posts", filter]`.
 */
export function postQueryKey(postId: string) {
  return ["posts", "detail", postId] as const
}

/** Chi tiết một bài đăng — dùng cho `/post/:id`. */
export function usePost(postId: string) {
  return useQuery({
    queryKey: postQueryKey(postId),
    queryFn: ({ signal }) => getPost(postId, signal),
    enabled: postId.length > 0,
  })
}
