import { api } from "@/lib/axios"

/**
 * `DELETE /posts/:id` — server trả 204 khi xoá thành công.
 *
 * 403 (không phải chủ bài) và 404 (bài không tồn tại) được ném ra để hook
 * gọi xử lý và báo toast cho người dùng.
 */
export async function deletePost(postId: string, signal?: AbortSignal): Promise<void> {
  await api.delete(`/posts/${postId}`, { signal })
}
