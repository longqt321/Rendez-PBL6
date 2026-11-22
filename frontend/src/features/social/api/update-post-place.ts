import { api } from "@/lib/axios"
import type { Post } from "../types/post"

export async function updatePostPlace(postId: string, placeId: string | null): Promise<Post> {
  const { data } = await api.patch<Post>(`/posts/${postId}/place`, { placeId })
  return data
}
