import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteAccount } from "../api/session"

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => deleteAccount(),
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
