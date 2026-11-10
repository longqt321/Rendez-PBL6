import { useMutation, useQueryClient } from "@tanstack/react-query"
import { markNotificationRead } from "../api/mark-notification-read"
import { notificationsQueryKey } from "./use-notifications"

/** Đánh dấu một thông báo đã đọc. */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
    },
  })
}
