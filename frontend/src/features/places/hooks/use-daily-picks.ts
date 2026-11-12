import { useQuery } from "@tanstack/react-query"
import { getDailyPicks } from "../api/get-daily-picks"

/**
 * Dữ liệu "Gợi ý hôm nay" — đổi theo ngày nên `staleTime` 5 phút khớp
 * `Cache-Control` của endpoint; lỗi thì component tự thu gọn (return null),
 * không cần cơ chế retry dài.
 */
export function useDailyPicks() {
  return useQuery({
    queryKey: ["daily-picks"],
    queryFn: ({ signal }) => getDailyPicks(signal),
    staleTime: 5 * 60_000,
    retry: 1,
  })
}
