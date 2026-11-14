import { act } from "@testing-library/react"
import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"

/**
 * Mock module api — không gọi mạng. Điểm cần xác nhận: gọi đúng endpoint qua
 * hàm api, invalidate query key `["posts", …]` khi thành công và toast lỗi khi
 * thất bại.
 */
const deletePost = vi.hoisted(() => vi.fn())

vi.mock("../api/delete-post", () => ({
  deletePost: (postId: string) => deletePost(postId) as Promise<void>,
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { useDeletePost } from "./use-delete-post"
import { renderWithQuery, waitForQuery } from "@/test/query-test-utils"

/** Hai query nằm dưới tiền tố `["posts"]` — cả hai phải bị invalidate. */
const FEED_KEYS = [
  ["posts", "all", ""],
  ["posts", "mine", ""],
] as const

function setupClient(): QueryClient {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  for (const key of FEED_KEYS) {
    client.setQueryData(key, { stale: false })
  }
  return client
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("useDeletePost", () => {
  it("gọi DELETE qua api và invalidate mọi query ['posts', …] khi thành công", async () => {
    deletePost.mockResolvedValue(undefined)
    const client = setupClient()
    const { result } = renderWithQuery(() => useDeletePost(), client)

    await act(async () => {
      await result.current.mutateAsync("p-1")
    })

    expect(deletePost).toHaveBeenCalledWith("p-1")
    expect(deletePost).toHaveBeenCalledTimes(1)
    for (const key of FEED_KEYS) {
      expect(client.getQueryState(key)?.isInvalidated).toBe(true)
    }
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Đã xoá bài đăng")
    expect(vi.mocked(toast.error)).not.toHaveBeenCalled()
  })

  it("lỗi (403/404) → không invalidate, toast lỗi kèm mô tả", async () => {
    deletePost.mockRejectedValue(new Error("Bạn không phải chủ bài đăng"))
    const client = setupClient()
    const { result } = renderWithQuery(() => useDeletePost(), client)

    await act(async () => {
      await result.current.mutateAsync("p-2").catch(() => undefined)
    })

    await waitForQuery(() => expect(result.current.isError).toBe(true))
    for (const key of FEED_KEYS) {
      expect(client.getQueryState(key)?.isInvalidated).toBe(false)
    }
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Không xoá được bài đăng", {
      description: "Bạn không phải chủ bài đăng",
    })
    expect(vi.mocked(toast.success)).not.toHaveBeenCalled()
  })
})
