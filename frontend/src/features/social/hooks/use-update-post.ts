import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { UpdatePostInput } from "@rendez/schema"
import { updatePost } from "../api/update-post"

export function useUpdatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId, input }: { postId: string; input: UpdatePostInput }) =>
      updatePost(postId, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["posts"] })
      void queryClient.invalidateQueries({ queryKey: ["post", variables.postId] })
      void queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })
}
