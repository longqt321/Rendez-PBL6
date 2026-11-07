import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { AppNotification } from "../types/notification"

/** `GET /notifications` — server trả danh sách đã phân trang. */
export async function getNotifications(signal?: AbortSignal): Promise<Page<AppNotification>> {
  const { data } = await api.get<Page<AppNotification>>("/notifications", { signal })
  return data
}
