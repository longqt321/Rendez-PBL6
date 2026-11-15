import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { isUnauthorizedError } from "@/lib/axios"
import { setPostLiked } from "../api/set-post-liked"
import { patchPostInCache } from "./patch-post-in-cache"

export function useSetPostLiked() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
      setPostLiked(postId, liked),
    onMutate: ({ postId, liked }) => {
      patchPostInCache(queryClient, postId, (post) => ({
        ...post,
        likedByMe: liked,
        likeCount: post.likeCount + (liked ? 1 : -1),
      }))
    },
    onError: (error, { postId, liked }) => {
      patchPostInCache(queryClient, postId, (post) => ({
        ...post,
        likedByMe: !liked,
        likeCount: post.likeCount + (liked ? -1 : 1),
      }))
      if (isUnauthorizedError(error)) return
      toast.error(liked ? "Không thích được bài đăng" : "Không bỏ thích được bài đăng", {
        description: error.message,
      })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts"] })
    },
  })
}
