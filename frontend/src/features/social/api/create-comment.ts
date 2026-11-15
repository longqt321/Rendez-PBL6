import { api } from "@/lib/axios"
import type { Comment, CreateCommentInput } from "../types/comment"

export async function createComment(postId: string, input: CreateCommentInput): Promise<Comment> {
  const { data } = await api.post<Comment>(`/posts/${postId}/comments`, input)
  return data
}
