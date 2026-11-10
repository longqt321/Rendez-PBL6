import { api } from "@/lib/axios"
import type { AppNotification } from "../types/notification"

/** `PATCH /notifications` — đánh dấu tất cả thông báo đã đọc. */
export async function markAllNotificationsRead(): Promise<AppNotification[]> {
  const { data } = await api.patch<AppNotification[]>("/notifications", { read: true })
  return data
}
