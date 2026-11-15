import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { Comment, CommentSort } from "../types/comment"

export async function getComments(
  postId: string,
  sort: CommentSort,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<Page<Comment>> {
  const { data } = await api.get<Page<Comment>>(`/posts/${postId}/comments`, {
    params: { sort, cursor: cursor ?? undefined },
    signal,
  })
  return data
}
