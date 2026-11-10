import { useMutation, useQueryClient } from "@tanstack/react-query"
import { setPostSaved } from "../api/set-post-saved"
import { patchPostInCache } from "./patch-post-in-cache"

/** Lưu / bỏ lưu bài đăng — optimistic như `useSetPostLiked`. */
export function useSetPostSaved() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId, saved }: { postId: string; saved: boolean }) =>
      setPostSaved(postId, saved),
    onMutate: ({ postId, saved }) => {
      patchPostInCache(queryClient, postId, (post) => ({ ...post, savedByMe: saved }))
    },
    onError: (_error, { postId, saved }) => {
      patchPostInCache(queryClient, postId, (post) => ({ ...post, savedByMe: !saved }))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts"] })
    },
  })
}
