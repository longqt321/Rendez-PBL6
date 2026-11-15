import { api } from "@/lib/axios"
import type { Post } from "../types/post"

export async function getPost(postId: string, signal?: AbortSignal): Promise<Post> {
  const { data } = await api.get<Post>(`/posts/${postId}`, { signal })
  return data
}
