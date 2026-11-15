import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteComment } from "../api/delete-comment"
import { patchPostInCache } from "./patch-post-in-cache"

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      patchPostInCache(queryClient, postId, (post) => ({
        ...post,
        commentCount: Math.max(0, post.commentCount - 1),
      }))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["comments", postId] })
    },
  })
}
