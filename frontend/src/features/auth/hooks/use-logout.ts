import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteSyncedLocation } from "@/features/location/api/location-api"
import { clearActiveRoom } from "@/features/rooms/lib/room"
import { writeStoredSourceKey } from "@/hooks/use-user-location"
import { logout } from "../api/session"

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await deleteSyncedLocation().catch(() => {})
      return logout()
    },
    onSuccess: () => {
      clearActiveRoom()
      writeStoredSourceKey(null)
      queryClient.clear()
    },
  })
}
