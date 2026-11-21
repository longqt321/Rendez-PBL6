import { useMutation, useQueryClient } from "@tanstack/react-query"
import { clearActiveRoom } from "@/features/rooms/lib/room"
import { logout } from "../api/session"

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      clearActiveRoom()
      queryClient.clear()
    },
  })
}
