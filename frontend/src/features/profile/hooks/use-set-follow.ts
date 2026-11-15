import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { InfiniteData } from "@tanstack/react-query"
import { toast } from "sonner"
import { followUser, unfollowUser } from "../api/set-follow"
import { profileQueryKey } from "./use-profile"
import { userSuggestionsQueryKey } from "@/features/search/hooks/use-user-suggestions"
import type { Page } from "@/types/api"
import type { UserProfile } from "../types/profile"
import type { UserSuggestion } from "@rendez/schema"

export function useSetFollow(handle: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ followed }: { followed: boolean }) =>
      followed ? followUser(handle) : unfollowUser(handle),
    onMutate: async ({ followed }) => {
      const key = profileQueryKey(handle)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData(key)
      queryClient.setQueryData(key, (profile: UserProfile | undefined) => {
        if (!profile) return profile
        return {
          ...profile,
          followedByMe: followed,
          followerCount: profile.followerCount + (followed ? 1 : -1),
        }
      })

      // Kết quả tìm kiếm: mọi query key con của `["users","search"]` (mỗi `q` một key).
      const searchKeys = queryClient
        .getQueryCache()
        .findAll({ queryKey: ["users", "search"] })
        .map((query) => query.queryKey)
      const searchSnapshots = searchKeys.map((searchKey) => ({
        searchKey,
        data: queryClient.getQueryData<InfiniteData<Page<UserProfile>>>(searchKey),
      }))
      for (const { searchKey } of searchSnapshots) {
        queryClient.setQueryData<InfiniteData<Page<UserProfile>>>(searchKey, (data) => {
          if (!data) return data
          return {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((user) =>
                user.handle === handle
                  ? {
                      ...user,
                      followedByMe: followed,
                      followerCount: user.followerCount + (followed ? 1 : -1),
                    }
                  : user,
              ),
            })),
          }
        })
      }

      // Gợi ý theo dõi: patch trực tiếp mảng items.
      const suggestionsKey = userSuggestionsQueryKey()
      const previousSuggestions = queryClient.getQueryData<UserSuggestion[]>(suggestionsKey)
      queryClient.setQueryData<UserSuggestion[]>(suggestionsKey, (items) =>
        items?.map((suggestion) =>
          suggestion.user.handle === handle
            ? {
                ...suggestion,
                user: {
                  ...suggestion.user,
                  followedByMe: followed,
                  followerCount: suggestion.user.followerCount + (followed ? 1 : -1),
                },
              }
            : suggestion,
        ),
      )

      return { previous, searchSnapshots, previousSuggestions }
    },
    onError: (error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(profileQueryKey(handle), context.previous)
      }
      for (const snapshot of context?.searchSnapshots ?? []) {
        queryClient.setQueryData(snapshot.searchKey, snapshot.data)
      }
      if (context?.previousSuggestions !== undefined) {
        queryClient.setQueryData(userSuggestionsQueryKey(), context.previousSuggestions)
      }
      // Không im lặng: rollback xong phải báo cho người dùng biết thao tác thất bại
      // (cùng lớp lỗi V6-01 — trước đây nút tự nhảy về như thể app đơ).
      toast.error("Không thể cập nhật theo dõi", { description: error.message })
    },
    onSettled: () => {
      // Invalidate theo prefix `["users"]`: làm mới hồ sơ, kết quả tìm kiếm lẫn
      // gợi ý trong một lần (cùng prefix key).
      void queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })
}
