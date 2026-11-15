import { api } from "@/lib/axios"
import type { Comment } from "../types/comment"

export async function setCommentLiked(commentId: string, liked: boolean): Promise<Comment> {
  const { data } = await api.patch<Comment>(`/comments/${commentId}/like`, { liked })
  return data
}
