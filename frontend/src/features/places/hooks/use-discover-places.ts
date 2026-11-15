import { useInfiniteQuery } from "@tanstack/react-query"
import { getPlaces, type DiscoverFilters } from "../api/get-places"

const roundCoord = (value: number | undefined): string | null =>
  value === undefined ? null : value.toFixed(4)

export function discoverQueryKey(filters: DiscoverFilters) {
  // `room` phải nằm trong key: đổi ràng buộc phòng phải fetch lại, không dùng
  // cache của kết quả trước đó.
  //
  // `sort`/`priceMax`/toạ độ BẮT BUỘC nằm trong key: `useInfiniteQuery` giữ
  // nguyên `pages` khi key không đổi rồi nối trang mới vào — thiếu chúng thì
  // đổi sort/filter giá sẽ nối trang 1 vào danh sách cũ (card nhân đôi, thứ tự
  // sai). Toạ độ làm tròn 4 chữ số: `watchPosition` nhích vài mét không được
  // tạo key mới (mất cache + refetch), nhưng đổi khu vực ~100 m+ thì phải.
  return [
    "places",
    filters.category,
    filters.district ?? "all",
    filters.query,
    filters.priceMax ?? "all",
    filters.sort ?? "newest",
    roundCoord(filters.coords?.lat),
    roundCoord(filters.coords?.lng),
    filters.room,
  ] as const
}

export function useDiscoverPlaces(filters: DiscoverFilters) {
  return useInfiniteQuery({
    queryKey: discoverQueryKey(filters),
    queryFn: ({ pageParam, signal }) => getPlaces(filters, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
  })
}
