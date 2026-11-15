import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createComment } from "../api/create-comment"
import { patchPostInCache } from "./patch-post-in-cache"
import type { Comment, CreateCommentInput } from "../types/comment"

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateCommentInput) => createComment(postId, input),
    onSuccess: (comment: Comment) => {
      queryClient.setQueriesData<{ pages: Array<{ items: Comment[] }> }>(
        { queryKey: ["comments", postId] },
        (data) => {
          if (!data) return data
          const [first, ...rest] = data.pages
          if (!first) return data
          return { ...data, pages: [{ ...first, items: [comment, ...first.items] }, ...rest] }
        },
      )
      patchPostInCache(queryClient, postId, (post) => ({
        ...post,
        commentCount: post.commentCount + 1,
      }))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["comments", postId] })
    },
  })
}
