import { api } from "@/lib/axios"
import type { Post } from "../types/post"

export async function setPostSaved(postId: string, saved: boolean): Promise<Post> {
  const { data } = await api.patch<Post>(`/posts/${postId}/save`, { saved })
  return data
}
