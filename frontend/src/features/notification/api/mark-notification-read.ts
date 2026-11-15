import { api } from "@/lib/axios"
import type { AppNotification } from "../types/notification"

export async function markNotificationRead(notificationId: string): Promise<AppNotification> {
  const { data } = await api.patch<AppNotification>(`/notifications/${notificationId}`, {
    read: true,
  })
  return data
}
