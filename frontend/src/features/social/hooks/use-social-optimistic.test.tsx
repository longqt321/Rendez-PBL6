import type { InfiniteData } from "@tanstack/react-query"
import { act, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createTestQueryClient, renderWithQuery } from "@/test/query-test-utils"
import type { Page } from "@/types/api"
import type { Post } from "../types/post"
import { useSetPostLiked } from "./use-set-post-liked"
import { useSetPostSaved } from "./use-set-post-saved"

const setPostLikedMock = vi.fn()
const setPostSavedMock = vi.fn()

vi.mock("../api/set-post-liked", () => ({
  setPostLiked: (...args: unknown[]) => setPostLikedMock(...args) as Promise<void>,
}))

vi.mock("../api/set-post-saved", () => ({
  setPostSaved: (...args: unknown[]) => setPostSavedMock(...args) as Promise<void>,
}))

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: "post-1",
    author: {
      id: "u1",
      name: "Minh",
      handle: "minh",
      initials: "M",
    },
    caption: "Quán ngon",
    pinnedAt: null,
    images: [],
    createdAt: "2026-11-22T10:00:00.000Z",
    placeId: null,
    likeCount: 10,
    commentCount: 0,
    likedByMe: false,
    savedByMe: false,
    place: null,
    ...overrides,
  }
}

describe("Social Optimistic Update & Rollback Resilience", () => {
  beforeEach(() => {
    setPostLikedMock.mockReset()
    setPostSavedMock.mockReset()
  })

  it("useSetPostLiked: cập nhật lạc quan ngay lập tức và rollback chính xác về giá trị cũ khi API lỗi 500", async () => {
    let rejectApi!: (err: Error) => void
    setPostLikedMock.mockImplementation(
      () =>
        new Promise<void>((_, reject) => {
          rejectApi = reject
        }),
    )

    const client = createTestQueryClient()
    const key = ["posts", "all"] as const
    const initial: InfiniteData<Page<Post>> = {
      pages: [{ items: [makePost({ id: "post-1", likeCount: 10, likedByMe: false })], next: null }],
      pageParams: [null],
    }
    client.setQueryData(key, initial)

    const { result } = renderWithQuery(() => useSetPostLiked(), client)

    act(() => {
      result.current.mutate({ postId: "post-1", liked: true })
    })

    // Lạc quan tăng ngay lên 11 trước khi API trả về
    await waitFor(() => {
      const mid = client.getQueryData<InfiniteData<Page<Post>>>(key)
      expect(mid?.pages[0]?.items[0]?.likedByMe).toBe(true)
      expect(mid?.pages[0]?.items[0]?.likeCount).toBe(11)
    })

    // Server trả lỗi 500 -> rollback chuẩn về false & 10
    act(() => {
      rejectApi(new Error("Internal Server Error"))
    })

    await waitFor(() => {
      const rolled = client.getQueryData<InfiniteData<Page<Post>>>(key)
      expect(rolled?.pages[0]?.items[0]?.likedByMe).toBe(false)
      expect(rolled?.pages[0]?.items[0]?.likeCount).toBe(10)
    })
  })

  it("useSetPostLiked: không cho phép likeCount giảm xuống âm và bỏ qua double-like trùng trạng thái", async () => {
    setPostLikedMock.mockResolvedValue(undefined)
    const client = createTestQueryClient()
    const key = ["posts", "all"] as const
    client.setQueryData<InfiniteData<Page<Post>>>(key, {
      pages: [
        { items: [makePost({ id: "post-zero", likeCount: 0, likedByMe: false })], next: null },
      ],
      pageParams: [null],
    })

    const { result } = renderWithQuery(() => useSetPostLiked(), client)

    // Bỏ thích khi likedByMe vốn đã là false và likeCount=0 -> không được thành -1
    await act(async () => {
      await result.current.mutateAsync({ postId: "post-zero", liked: false })
    })

    const after = client.getQueryData<InfiniteData<Page<Post>>>(key)
    expect(after?.pages[0]?.items[0]?.likeCount).toBe(0)
    expect(after?.pages[0]?.items[0]?.likedByMe).toBe(false)
  })

  it("useSetPostSaved: rollback savedByMe khi API lưu bài thất bại", async () => {
    setPostSavedMock.mockRejectedValue(new Error("Network down"))
    const client = createTestQueryClient()
    const key = ["posts", "all"] as const
    client.setQueryData<InfiniteData<Page<Post>>>(key, {
      pages: [{ items: [makePost({ id: "post-save", savedByMe: false })], next: null }],
      pageParams: [null],
    })

    const { result } = renderWithQuery(() => useSetPostSaved(), client)

    act(() => {
      result.current.mutate({ postId: "post-save", saved: true })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    const rolled = client.getQueryData<InfiniteData<Page<Post>>>(key)
    expect(rolled?.pages[0]?.items[0]?.savedByMe).toBe(false)
  })
})
