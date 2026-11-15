import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { isUnauthorizedError } from "@/lib/axios"
import { deletePost } from "../api/delete-post"

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
