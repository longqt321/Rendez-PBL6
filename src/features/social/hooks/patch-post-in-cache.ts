import type { QueryClient } from "@tanstack/react-query"
import type { Page } from "@/types/api"
import type { Post } from "../types/post"

/**
 * Cập nhật tạm một bài trong cache feed (dùng cho optimistic update).
 *
 * Chỉ sửa bản copy trong cache để UI phản hồi ngay; server vẫn là nguồn sự thật
 * và response thật sẽ ghi đè sau khi mutation xong.
 */
export function patchPostInCache(
  queryClient: QueryClient,
  postId: string,
  updater: (post: Post) => Post,
): void {
  queryClient.setQueriesData<Page<Post>>({ queryKey: ["posts"] }, (page) => {
    if (!page) return page
    return {
      ...page,
      items: page.items.map((post) => (post.id === postId ? updater(post) : post)),
    }
  })
}
