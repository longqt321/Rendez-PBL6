import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { Comment, CommentSort } from "../types/comment"

/**
 * `GET /posts/:id/comments?cursor=&sort=` — danh sách bình luận.
 *
 * Server sắp xếp và phân trang; client chỉ gửi tham số và chuyền lại `cursor`
 * do server trả về.
 */
export async function getComments(
  postId: string,
  sort: CommentSort,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<Page<Comment>> {
  const { data } = await api.get<Page<Comment>>(`/posts/${postId}/comments`, {
    params: { sort, cursor: cursor ?? undefined },
    signal,
  })
  return data
}
