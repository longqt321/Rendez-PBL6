import { api } from "@/lib/axios"

export async function deletePost(postId: string, signal?: AbortSignal): Promise<void> {
  await api.delete(`/posts/${postId}`, { signal })
}
