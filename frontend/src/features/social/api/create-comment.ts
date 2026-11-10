import { api } from "@/lib/axios"
import type { Comment, CreateCommentInput } from "../types/comment"

/** `POST /posts/:id/comments` — server tạo bình luận, cập nhật commentCount và trả về bản ghi. */
export async function createComment(postId: string, input: CreateCommentInput): Promise<Comment> {
  const { data } = await api.post<Comment>(`/posts/${postId}/comments`, input)
  return data
}
