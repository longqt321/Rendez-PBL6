import { useMutation, useQueryClient } from "@tanstack/react-query"
import { logout } from "../api/session"

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
