import { act } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { InfiniteData } from "@tanstack/react-query"
import type { Page } from "@/types/api"
import type { UserProfile } from "../types/profile"
import type { UserSuggestion } from "@rendez/schema"
import { createTestQueryClient, renderWithQuery } from "@/test/query-test-utils"
import { usersSearchQueryKey } from "@/features/search/hooks/use-users-search"
import { userSuggestionsQueryKey } from "@/features/search/hooks/use-user-suggestions"
import { profileQueryKey } from "./use-profile"
import { useSetFollow } from "./use-set-follow"

const PROFILE: UserProfile = {
  id: "u-lan",
  name: "Lan Anh",
  handle: "lananh.cafe",
  initials: "LA",
  bio: "",
  location: "TP. Hồ Chí Minh",
  avatarUrl: null,
  coverUrl: null,
  joinedAt: "2025-06-02T00:00:00+07:00",
  postCount: 0,
  followerCount: 3,
  followingCount: 1,
  followedByMe: false,
  isMe: false,
  privateProfile: false,
}

const SEARCH_KEY = usersSearchQueryKey("lan")

function seed(client: ReturnType<typeof createTestQueryClient>) {
  client.setQueryData<UserProfile>(profileQueryKey(PROFILE.handle), PROFILE)
  client.setQueryData<InfiniteData<Page<UserProfile>>>(SEARCH_KEY, {
    pages: [{ items: [PROFILE], next: null }],
    pageParams: [null],
  })
  client.setQueryData<UserSuggestion[]>(userSuggestionsQueryKey(), [
    { user: PROFILE, reason: "Gợi ý cho bạn" },
  ])
}

describe("useSetFollow", () => {
  it("follow → patch followedByMe + followerCount ở hồ sơ, kết quả tìm kiếm và gợi ý", async () => {
    const client = createTestQueryClient()
    seed(client)

    const { result } = renderWithQuery(() => useSetFollow(PROFILE.handle), client)
    await act(async () => {
      await result.current.mutateAsync({ followed: true })
    })

    const profile = client.getQueryData<UserProfile>(profileQueryKey(PROFILE.handle))
    expect(profile).toMatchObject({ followedByMe: true, followerCount: 4 })

    const search = client.getQueryData<InfiniteData<Page<UserProfile>>>(SEARCH_KEY)
    expect(search?.pages[0]?.items[0]).toMatchObject({ followedByMe: true, followerCount: 4 })

    const suggestions = client.getQueryData<UserSuggestion[]>(userSuggestionsQueryKey())
    expect(suggestions?.[0]?.user).toMatchObject({ followedByMe: true, followerCount: 4 })
  })

  it("unfollow → trả followedByMe về false, followerCount -1 ở cả hai shape", async () => {
    const client = createTestQueryClient()
    seed(client)
    // Trạng thái ban đầu: đã theo dõi.
    client.setQueryData<UserProfile>(profileQueryKey(PROFILE.handle), {
      ...PROFILE,
      followedByMe: true,
      followerCount: 4,
    })
    client.setQueryData<InfiniteData<Page<UserProfile>>>(SEARCH_KEY, {
      pages: [{ items: [{ ...PROFILE, followedByMe: true, followerCount: 4 }], next: null }],
      pageParams: [null],
    })
    client.setQueryData<UserSuggestion[]>(userSuggestionsQueryKey(), [
      { user: { ...PROFILE, followedByMe: true, followerCount: 4 }, reason: "Gợi ý cho bạn" },
    ])

    const { result } = renderWithQuery(() => useSetFollow(PROFILE.handle), client)
    await act(async () => {
      await result.current.mutateAsync({ followed: false })
    })

    const profile = client.getQueryData<UserProfile>(profileQueryKey(PROFILE.handle))
    expect(profile).toMatchObject({ followedByMe: false, followerCount: 3 })

    const search = client.getQueryData<InfiniteData<Page<UserProfile>>>(SEARCH_KEY)
    expect(search?.pages[0]?.items[0]).toMatchObject({ followedByMe: false, followerCount: 3 })

    const suggestions = client.getQueryData<UserSuggestion[]>(userSuggestionsQueryKey())
    expect(suggestions?.[0]?.user).toMatchObject({ followedByMe: false, followerCount: 3 })
  })
})
