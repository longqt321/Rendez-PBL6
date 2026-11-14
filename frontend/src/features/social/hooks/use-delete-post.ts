import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { isUnauthorizedError } from "@/lib/axios"
import { deletePost } from "../api/delete-post"

/**
 * Xoá bài đăng của chính mình.
 *
 * Server trả 204; client không tự xoá dữ liệu trong cache mà invalidate toàn
 * bộ query dưới tiền tố `["posts"]` (feed phân trang lẫn bài lẻ của trang chi
 * tiết) để server là nguồn sự thật.
 *
 * Riêng 401 do interceptor toàn cục lo (toast "Phiên đăng nhập đã hết hạn" +
 * điều hướng) nên không báo trùng.
 */
export function useDeletePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts"] })
      toast.success("Đã xoá bài đăng")
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) return
      toast.error("Không xoá được bài đăng", { description: error.message })
    },
  })
}
