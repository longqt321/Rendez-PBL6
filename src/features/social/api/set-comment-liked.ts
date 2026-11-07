import { api } from "@/lib/axios"
import type { Comment } from "../types/comment"

/** `PATCH /comments/:id/like` — server giữ số đếm, client chỉ gửi trạng thái mong muốn. */
export async function setCommentLiked(commentId: string, liked: boolean): Promise<Comment> {
  const { data } = await api.patch<Comment>(`/comments/${commentId}/like`, { liked })
  return data
}
