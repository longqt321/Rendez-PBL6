import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createPost } from "../api/create-post"
import type { CreatePostInput } from "../types/post"

/** Tạo bài đăng. Server trả bản ghi đầy đủ nên chỉ cần làm mới feed. */
export function useCreatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreatePostInput) => createPost(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts"] })
      // Bài mới có thể sinh thông báo đề xuất địa điểm ở phía server.
      void queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}
