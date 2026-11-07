import { useMutation, useQueryClient } from "@tanstack/react-query"
import { setPostLiked } from "../api/set-post-liked"
import { patchPostInCache } from "./patch-post-in-cache"

/**
 * Thích / bỏ thích bài đăng.
 *
 * Optimistic: đổi ngay trong cache, rollback nếu server lỗi. Số đếm cuối cùng
 * luôn lấy từ server.
 */
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
    onError: (_error, { postId, liked }) => {
      patchPostInCache(queryClient, postId, (post) => ({
        ...post,
        likedByMe: !liked,
        likeCount: post.likeCount + (liked ? -1 : 1),
      }))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts"] })
    },
  })
}
