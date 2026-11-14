import { useQuery } from "@tanstack/react-query"
import { getPlace } from "../api/get-place-detail"
import { getRecentlyViewedIds, RECENTLY_VIEWED_LIMIT } from "../lib/recently-viewed"
import type { Place } from "../types/place"

/**
 * Địa điểm "Bạn vừa xem" — fetch song song theo id đã lưu (tối đa
 * `RECENTLY_VIEWED_LIMIT`). Id lỗi (404: đã bị gỡ/hạ publish) bị bỏ khỏi kết
 * quả, không làm hỏng cả dải.
 */
export function useRecentlyViewed(excludeId?: string) {
  return useQuery({
    queryKey: ["recently-viewed", getRecentlyViewedIds().join(","), excludeId ?? ""],
    queryFn: async ({ signal }): Promise<Place[]> => {
      const ids = getRecentlyViewedIds()
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
