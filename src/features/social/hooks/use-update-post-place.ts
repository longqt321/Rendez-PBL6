import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updatePostPlace } from "../api/update-post-place"

/**
 * Gắn địa điểm cho bài đăng.
 *
 * Server quyết định địa điểm có lên /discover hay không, nên sau khi xong phải làm
 * mới cả feed, danh sách thông báo và lưới /discover.
 */
export function useUpdatePostPlace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId, placeId }: { postId: string; placeId: string }) =>
      updatePostPlace(postId, placeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts"] })
      void queryClient.invalidateQueries({ queryKey: ["notifications"] })
      void queryClient.invalidateQueries({ queryKey: ["places"] })
    },
  })
}
