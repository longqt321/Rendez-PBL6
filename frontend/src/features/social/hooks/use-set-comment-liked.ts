import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { isUnauthorizedError } from "@/lib/axios"
import { setCommentLiked } from "../api/set-comment-liked"
import type { CommentSort } from "../types/comment"

/**
 * Thích / bỏ thích bình luận.
 *
 * Optimistic: đổi ngay trong mọi cache bình luận của bài, rollback nếu server
 * lỗi. Số đếm cuối cùng luôn lấy từ server.
 */
export function useSetCommentLiked(postId: string) {
  const queryClient = useQueryClient()

  const patchLike = (commentId: string, liked: boolean) => {
    queryClient.setQueriesData<{
      pages: Array<{ items: Array<{ id: string; likeCount: number; likedByMe: boolean }> }>
    }>({ queryKey: ["comments", postId] }, (data) => {
      if (!data) return data
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  likedByMe: liked,
                  likeCount: comment.likeCount + (liked ? 1 : -1),
                }
              : comment,
          ),
        })),
      }
    })
  }

  return useMutation({
    mutationFn: ({ commentId, liked }: { commentId: string; liked: boolean }) =>
      setCommentLiked(commentId, liked),
    onMutate: ({ commentId, liked }) => patchLike(commentId, liked),
    // Lỗi phải báo cho người dùng (V6-01) — 401 do interceptor toàn cục lo.
    onError: (error, { commentId, liked }) => {
      patchLike(commentId, !liked)
      if (isUnauthorizedError(error)) return
      toast.error(liked ? "Không thích được bình luận" : "Không bỏ thích được bình luận", {
        description: error.message,
      })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["comments", postId] })
    },
  })
}

export type { CommentSort }
