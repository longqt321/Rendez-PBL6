import { api } from "@/lib/axios"

/** `DELETE /comments/:id` — server xoá mềm; client không tự xử lý dữ liệu. */
export async function deleteComment(commentId: string): Promise<void> {
  await api.delete(`/comments/${commentId}`)
}
