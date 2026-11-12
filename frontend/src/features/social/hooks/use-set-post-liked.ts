import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { isUnauthorizedError } from "@/lib/axios"
import { setPostLiked } from "../api/set-post-liked"
import { patchPostInCache } from "./patch-post-in-cache"

/**
 * Thích / bỏ thích bài đăng.
 *
 * Optimistic: đổi ngay trong cache, rollback nếu server lỗi. Số đếm cuối cùng
 * luôn lấy từ server.
 *
 * Lỗi phải được BÁO cho người dùng: trước đây mutation offline/401 rollback
 * nhưng im lặng, người dùng thấy like "không ăn" mà không hiểu vì sao (V6-01).
 * Riêng 401 do interceptor toàn cục lo (toast "Phiên đăng nhập đã hết hạn" +
 * điều hướng) nên không báo trùng.
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
