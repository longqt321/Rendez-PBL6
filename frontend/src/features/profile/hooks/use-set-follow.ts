import { useMutation, useQueryClient } from "@tanstack/react-query"
import { followUser, unfollowUser } from "../api/set-follow"
import { profileQueryKey } from "./use-profile"
import type { UserProfile } from "../types/profile"

/**
 * Theo dõi / bỏ theo dõi.
 *
 * Optimistic: đổi `followedByMe` và đếm ngay trong cache, rollback nếu lỗi.
 */
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
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(profileQueryKey(handle), context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: profileQueryKey(handle) })
    },
  })
}
