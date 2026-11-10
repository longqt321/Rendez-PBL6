import { api } from "@/lib/axios"
import type { Post } from "../types/post"

/**
 * `PATCH /posts/:id/place` — gắn địa điểm cho bài.
 *
 * Server là bên quyết định địa điểm có được đưa lên /discover hay không; response
 * trả về bài đã cập nhật kèm `place` mới.
 */
export async function updatePostPlace(postId: string, placeId: string): Promise<Post> {
  const { data } = await api.patch<Post>(`/posts/${postId}/place`, { placeId })
  return data
}
