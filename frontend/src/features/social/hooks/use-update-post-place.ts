import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updatePostPlace } from "../api/update-post-place"

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
