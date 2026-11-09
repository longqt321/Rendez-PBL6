import { useInfiniteQuery } from "@tanstack/react-query"
import { getSavedPlaces } from "../api/get-saved-places"

export const savedPlacesQueryKey = ["places", "saved"] as const

/**
 * Địa điểm đã lưu (nằm trong bộ sưu tập của tôi), phân trang theo cursor —
 * cùng cơ chế với feed bài đăng; không đọc toàn bộ danh sách một lần vì
 * backend thật sẽ cắt theo trang.
 */
export function useSavedPlacesQuery() {
  return useInfiniteQuery({
    queryKey: savedPlacesQueryKey,
    queryFn: ({ pageParam, signal }) => getSavedPlaces(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
  })
}

/** Danh sách địa điểm đã tải của tab "Địa điểm" — phẳng hoá các trang server trả về. */
export function useSavedPlaces() {
  const query = useSavedPlacesQuery()
  return {
    ...query,
    places: query.data?.pages.flatMap((page) => page.items) ?? [],
  }
}
