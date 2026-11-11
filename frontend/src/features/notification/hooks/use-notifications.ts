import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { getNotifications } from "../api/get-notifications"

/** Tiền tố chung — mutation đánh dấu đã đọc làm mới cả danh sách lẫn số chưa đọc. */
export const notificationsQueryKey = ["notifications"] as const

/**
 * Danh sách thông báo, phân trang theo cursor.
 *
 * Server là bên sinh thông báo (kể cả "Đề xuất thêm địa điểm"); hook này chỉ đọc.
 * Dùng `notifications` để lấy mảng phẳng các thông báo đã tải.
 */
export function useNotifications() {
  const query = useInfiniteQuery({
    queryKey: [...notificationsQueryKey, "list"],
    queryFn: ({ pageParam, signal }) => getNotifications(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
    // Server sinh thông báo (đề xuất địa điểm, follow, like) — poll 60 giây để
    // trang đang mở thấy thông báo mới mà không cần SSE (xem DECISIONS 28).
    refetchInterval: 60_000,
  })

  return {
    ...query,
    notifications: query.data?.pages.flatMap((page) => page.items) ?? [],
  }
}

/**
 * Chỉ đếm số chưa đọc — dùng cho badge ở layout, tránh re-render vì danh sách đổi.
 *
 * Đếm trên trang đầu tiên server trả về (hợp đồng hiện tại chưa có endpoint đếm
 * riêng); badge chỉ cần con số gần đúng để nhắc người dùng.
 */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: [...notificationsQueryKey, "unread-count"],
    queryFn: ({ signal }) => getNotifications(null, signal),
    select: (page) => page.items.filter((notification) => !notification.read).length,
    // Badge ở layout luôn mount — poll 60 giây để số chưa đọc không bị cũ.
    refetchInterval: 60_000,
  })
}
