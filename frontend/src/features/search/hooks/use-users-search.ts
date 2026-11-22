import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"
import { getUsers } from "../api/get-users"

export function usersSearchQueryKey(q: string) {
  return ["users", "search", q] as const
}

export function useUsersSearch(q: string) {
  return useInfiniteQuery({
    queryKey: usersSearchQueryKey(q),
    queryFn: ({ pageParam, signal }) => getUsers(q, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
    placeholderData: keepPreviousData,
  })
}
