import { useInfiniteQuery } from "@tanstack/react-query"
import { getProfilePosts } from "../api/get-profile-posts"
import type { ProfileTab } from "../types/profile"

export function profilePostsQueryKey(handle: string, tab: ProfileTab) {
  return ["users", handle, "posts", tab] as const
}

/** Bài đăng của người dùng theo tab — server lọc và phân trang. */
export function useProfilePosts(handle: string, tab: ProfileTab) {
  return useInfiniteQuery({
    queryKey: profilePostsQueryKey(handle, tab),
    queryFn: ({ pageParam, signal }) => getProfilePosts(handle, tab, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
  })
}
