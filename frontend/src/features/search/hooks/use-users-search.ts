import { useInfiniteQuery } from "@tanstack/react-query"
import { getUsers } from "../api/get-users"

export function usersSearchQueryKey(q: string) {
  return ["users", "search", q] as const
}

/** Tìm người dùng cho tab Người của trang Tìm kiếm — phân trang cursor. */
export function useUsersSearch(q: string) {
  return useInfiniteQuery({
    queryKey: usersSearchQueryKey(q),
    queryFn: ({ pageParam, signal }) => getUsers(q, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
  })
}
