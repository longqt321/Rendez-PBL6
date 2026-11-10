import { api } from "@/lib/axios"
import type { Post } from "../types/post"

/** `PATCH /posts/:id/save` — lưu/bỏ lưu bài đăng. */
export async function setPostSaved(postId: string, saved: boolean): Promise<Post> {
  const { data } = await api.patch<Post>(`/posts/${postId}/save`, { saved })
  return data
}
