import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { Post, PostFeedFilter } from "../types/post"

export type GetPostsParams = {
  /** Bộ lọc feed; server quyết định bài nào thuộc bộ lọc nào. */
  filter: PostFeedFilter
  /** Tìm theo nội dung bài đăng (server tự chuẩn hoá, bỏ dấu). */
  q?: string
}

/**
 * `GET /posts?filter=...&q=...` — feed cộng đồng, phân trang theo cursor.
 *
 * Server quyết định bài nào thuộc bộ lọc nào; client chỉ gửi tham số và chuyền
 * lại `cursor` mà server trả về khi tải trang kế tiếp.
 */
export async function getPosts(
  { filter, q }: GetPostsParams,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<Page<Post>> {
  const { data } = await api.get<Page<Post>>("/posts", {
    params: { filter, q: q?.trim() || undefined, cursor: cursor ?? undefined },
    signal,
  })
  return data
}
