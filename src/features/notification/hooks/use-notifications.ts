import { useQuery } from "@tanstack/react-query"
import { getNotifications } from "../api/get-notifications"

export const notificationsQueryKey = ["notifications"] as const

/**
 * Danh sách thông báo.
 *
 * Server là bên sinh thông báo (kể cả "Đề xuất thêm địa điểm"); hook này chỉ đọc.
 */
export function useNotifications() {
  return useQuery({
    queryKey: notificationsQueryKey,
    queryFn: ({ signal }) => getNotifications(signal),
  })
}

/** Chỉ đếm số chưa đọc — dùng cho badge ở layout, tránh re-render vì danh sách đổi. */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationsQueryKey,
    queryFn: ({ signal }) => getNotifications(signal),
    select: (page) => page.items.filter((notification) => !notification.read).length,
  })
}
