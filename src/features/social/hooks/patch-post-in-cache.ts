import type { QueryClient } from "@tanstack/react-query"
import type { Page } from "@/types/api"
import type { Post } from "../types/post"

/**
 * Cập nhật tạm một bài trong cache (dùng cho optimistic update).
 *
 * Chạm cả hai dạng dữ liệu nằm dưới tiền tố `["posts"]`:
 * - danh sách `Page<Post>` của feed,
 * - một bài lẻ của trang chi tiết `/post/:id`.
 *
 * Chỉ sửa bản copy trong cache để UI phản hồi ngay; server vẫn là nguồn sự thật
 * và response thật sẽ ghi đè sau khi mutation xong.
 */
export function patchPostInCache(
  queryClient: QueryClient,
  postId: string,
  updater: (post: Post) => Post,
): void {
  queryClient.setQueriesData<Page<Post> | Post>({ queryKey: ["posts"] }, (data) => {
    if (!data) return data
    if ("items" in data) {
      return {
        ...data,
        items: data.items.map((post) => (post.id === postId ? updater(post) : post)),
      }
    }
    return data.id === postId ? updater(data) : data
  })
}
