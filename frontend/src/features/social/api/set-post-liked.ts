import { api } from "@/lib/axios"
import type { Post } from "../types/post"

export async function setPostLiked(postId: string, liked: boolean): Promise<Post> {
  const { data } = await api.patch<Post>(`/posts/${postId}/like`, { liked })
  return data
}
