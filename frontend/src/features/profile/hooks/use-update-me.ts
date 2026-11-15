import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateMe } from "../api/update-me"
import type { UpdateMeInput } from "../types/profile.schema"

export function useUpdateMe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateMeInput) => updateMe(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(["me"], profile)
      void queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })
}
