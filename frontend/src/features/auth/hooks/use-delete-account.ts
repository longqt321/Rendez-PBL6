import { useMutation, useQueryClient } from "@tanstack/react-query"
import { clearActiveRoom } from "@/features/rooms/lib/room"
import { deleteAccount } from "../api/session"

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => deleteAccount(),
    onSuccess: () => {
      clearActiveRoom()
      queryClient.clear()
    },
  })
}
