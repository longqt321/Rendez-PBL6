import { api } from "@/lib/axios"

export async function deleteComment(commentId: string): Promise<void> {
  await api.delete(`/comments/${commentId}`)
}
