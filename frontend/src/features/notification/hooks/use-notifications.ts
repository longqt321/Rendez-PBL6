import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { useMe } from "@/features/profile/hooks/use-me"
import { getNotifications } from "../api/get-notifications"

export const notificationsQueryKey = ["notifications"] as const

export function useNotifications() {
  const { data: me } = useMe()
  const query = useInfiniteQuery({
    queryKey: [...notificationsQueryKey, "list"],
    queryFn: ({ pageParam, signal }) => getNotifications(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
    enabled: Boolean(me),
    // Server sinh thông báo (đề xuất địa điểm, follow, like) — poll 60 giây để
    // trang đang mở thấy thông báo mới mà không cần SSE (xem DECISIONS 28).
    refetchInterval: me ? 60_000 : false,
  })

  return {
    ...query,
    notifications: query.data?.pages.flatMap((page) => page.items) ?? [],
  }
}

export function useUnreadNotificationCount() {
  const { data: me } = useMe()
  return useQuery({
    queryKey: [...notificationsQueryKey, "unread-count"],
    queryFn: ({ signal }) => getNotifications(null, signal),
    select: (page) => page.items.filter((notification) => !notification.read).length,
    enabled: Boolean(me),
    // Badge ở layout luôn mount — poll 60 giây để số chưa đọc không bị cũ.
    refetchInterval: me ? 60_000 : false,
  })
}
