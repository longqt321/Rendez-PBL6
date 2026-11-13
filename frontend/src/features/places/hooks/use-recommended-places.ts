import { useQuery } from "@tanstack/react-query"
import { getRecommendedPlaces } from "../api/get-recommended-places"

/**
 * Dữ liệu "Gợi ý cho bạn" — cá nhân hoá theo lịch sử tương tác.
 *
 * Hàm api đã nuốt lỗi thành `[]` nên không cần retry dài; `staleTime` 5 phút
 * khớp nhịp dải "Gợi ý hôm nay" để hai dải không gọi lại liên tục.
 */
export function useRecommendedPlaces(limit = 6) {
  return useQuery({
    queryKey: ["recommended-places", limit],
    queryFn: ({ signal }) => getRecommendedPlaces(limit, signal),
    staleTime: 5 * 60_000,
    retry: 1,
  })
}
