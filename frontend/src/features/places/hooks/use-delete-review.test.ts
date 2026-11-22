import { act } from "@testing-library/react"
import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import type { Review } from "../types/review"

const deleteReview = vi.hoisted(() => vi.fn())

vi.mock("../api/delete-review", () => ({
  deleteReview: (placeId: string) => deleteReview(placeId) as Promise<void>,
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { useDeleteReview } from "./use-delete-review"
import { renderWithQuery, waitForQuery } from "@/test/query-test-utils"

const PLACE_ID = "banh-xeo-ba-duong"

const MOCK_REVIEWS: Review[] = [
  {
    id: "r-mine",
    placeId: PLACE_ID,
    author: { id: "u-me", name: "Tôi", handle: "toi", initials: "T" },
    tier: "must_try",
    recommendedDishes: [],
    quickTags: [],
    content: "Ngon tuyệt!",
    createdAt: "2026-11-10T10:00:00Z",
    isMine: true,
  },
  {
    id: "r-other",
    placeId: PLACE_ID,
    author: { id: "u-other", name: "Bạn khác", handle: "other", initials: "BK" },
    tier: "must_try",
    recommendedDishes: [],
    quickTags: [],
    content: "Khá ổn.",
    createdAt: "2026-11-09T10:00:00Z",
    isMine: false,
  },
]

function setupClient(): QueryClient {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(["places", PLACE_ID, "reviews"], MOCK_REVIEWS)
  client.setQueryData(["places", PLACE_ID], { id: PLACE_ID, rating: 4.5, reviewCount: 2 })
  client.setQueryData(["places"], [{ id: PLACE_ID }])
  return client
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("useDeleteReview", () => {
  it("gọi DELETE qua api, xoá review của mình trong cache và invalidate queries", async () => {
    deleteReview.mockResolvedValue(undefined)
    const client = setupClient()
    const { result } = renderWithQuery(() => useDeleteReview(PLACE_ID), client)

    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(deleteReview).toHaveBeenCalledWith(PLACE_ID)
    expect(deleteReview).toHaveBeenCalledTimes(1)

    // Cache reviews đã loại bỏ review của chính mình
    const cachedReviews = client.getQueryData<Review[]>(["places", PLACE_ID, "reviews"])
    expect(cachedReviews).toHaveLength(1)
    expect(cachedReviews?.[0]?.id).toBe("r-other")

    // Các query liên quan đã bị invalidate
    expect(client.getQueryState(["places", PLACE_ID, "reviews"])?.isInvalidated).toBe(true)
    expect(client.getQueryState(["places", PLACE_ID])?.isInvalidated).toBe(true)
    expect(client.getQueryState(["places"])?.isInvalidated).toBe(true)

    expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Đã xoá đánh giá")
    expect(vi.mocked(toast.error)).not.toHaveBeenCalled()
  })

  it("thất bại khi gọi API → không làm rỗng cache, toast lỗi", async () => {
    deleteReview.mockRejectedValue(new Error("Lỗi mạng"))
    const client = setupClient()
    const { result } = renderWithQuery(() => useDeleteReview(PLACE_ID), client)

    await act(async () => {
      await result.current.mutateAsync().catch(() => undefined)
    })

    await waitForQuery(() => expect(result.current.isError).toBe(true))

    const cachedReviews = client.getQueryData<Review[]>(["places", PLACE_ID, "reviews"])
    expect(cachedReviews).toHaveLength(2)

    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Không xoá được đánh giá, thử lại nhé")
    expect(vi.mocked(toast.success)).not.toHaveBeenCalled()
  })
})
