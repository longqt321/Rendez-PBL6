import { useMutation, useQueryClient } from "@tanstack/react-query"
import { markAllNotificationsRead } from "../api/mark-all-notifications-read"
import { notificationsQueryKey } from "./use-notifications"

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
    },
  })
}
