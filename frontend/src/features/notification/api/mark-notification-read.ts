import { api } from "@/lib/axios"
import type { AppNotification } from "../types/notification"

/** `PATCH /notifications/:id` — đánh dấu một thông báo đã đọc. */
export async function markNotificationRead(notificationId: string): Promise<AppNotification> {
  const { data } = await api.patch<AppNotification>(`/notifications/${notificationId}`, {
    read: true,
  })
  return data
}
