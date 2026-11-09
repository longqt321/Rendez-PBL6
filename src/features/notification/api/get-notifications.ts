import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { AppNotification } from "../types/notification"

/**
 * `GET /notifications?cursor=...` — server trả danh sách đã phân trang.
 *
 * `cursor` do server sinh; client chỉ chuyền lại khi tải trang kế tiếp.
 */
export async function getNotifications(
  cursor: string | null,
  signal?: AbortSignal,
): Promise<Page<AppNotification>> {
  const { data } = await api.get<Page<AppNotification>>("/notifications", {
    params: { cursor: cursor ?? undefined },
    signal,
  })
  return data
}
