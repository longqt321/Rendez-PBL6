import { useInfiniteQuery } from "@tanstack/react-query"
import { getComments } from "../api/get-comments"
import type { CommentSort } from "../types/comment"

export function commentsQueryKey(postId: string, sort: CommentSort) {
  return ["comments", postId, sort] as const
}

export function useComments(postId: string, sort: CommentSort) {
  return useInfiniteQuery({
    queryKey: commentsQueryKey(postId, sort),
    queryFn: ({ pageParam, signal }) => getComments(postId, sort, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
  })
}
