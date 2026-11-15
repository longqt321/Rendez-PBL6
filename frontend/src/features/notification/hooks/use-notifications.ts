import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { getNotifications } from "../api/get-notifications"

export const notificationsQueryKey = ["notifications"] as const

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

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: [...notificationsQueryKey, "unread-count"],
    queryFn: ({ signal }) => getNotifications(null, signal),
    select: (page) => page.items.filter((notification) => !notification.read).length,
    // Badge ở layout luôn mount — poll 60 giây để số chưa đọc không bị cũ.
    refetchInterval: 60_000,
  })
}
