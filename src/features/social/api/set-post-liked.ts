import { api } from "@/lib/axios"
import type { Post } from "../types/post"

/** `PATCH /posts/:id/like` — server giữ số đếm, client chỉ gửi trạng thái mong muốn. */
export async function setPostLiked(postId: string, liked: boolean): Promise<Post> {
  const { data } = await api.patch<Post>(`/posts/${postId}/like`, { liked })
  return data
}
