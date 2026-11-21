import { useQuery } from "@tanstack/react-query"
import { useMe } from "@/features/profile/hooks/use-me"
import { getPlace } from "../api/get-place-detail"
import { getRecentlyViewedIds, GUEST_SCOPE, RECENTLY_VIEWED_LIMIT } from "../lib/recently-viewed"
import type { Place } from "../types/place"

export function useRecentlyViewed(excludeId?: string) {
  // Lịch sử xem thuộc về từng người xem — chờ biết ai đang đăng nhập rồi mới
  // đọc, tránh hiển thị nhầm lịch sử của tài khoản trước.
  const { data: me, isPending: mePending } = useMe()
  const scope = me?.id ?? GUEST_SCOPE

  return useQuery({
    queryKey: ["recently-viewed", scope, getRecentlyViewedIds(scope).join(","), excludeId ?? ""],
    enabled: !mePending,
    queryFn: async ({ signal }): Promise<Place[]> => {
      const ids = getRecentlyViewedIds(scope)
        .filter((id) => id !== excludeId)
        .slice(0, RECENTLY_VIEWED_LIMIT)
      const results = await Promise.allSettled(ids.map((id) => getPlace(id, signal)))
      return results
        .filter((result): result is PromiseFulfilledResult<Place> => result.status === "fulfilled")
        .map((result) => result.value)
    },
    staleTime: 60_000,
    retry: 1,
  })
}
