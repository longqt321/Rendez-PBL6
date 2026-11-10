import { act } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useDiscoverPlaces } from "./use-discover-places"
import type { PlaceCategory } from "../types/place"
import { renderWithQuery, waitForQuery } from "@/test/query-test-utils"

const VALID_CATEGORIES: PlaceCategory[] = [
  "cafe",
  "restaurant",
  "street-food",
  "bakery",
  "dessert",
  "bar",
]

/**
 * Test hook dữ liệu chạy qua mock adapter (axios thật + `mockAdapter` của
 * `src/mocks/server.ts`) — không mock module api.
 */
describe("useDiscoverPlaces", () => {
  it("trang đầu trả về địa điểm có shape đúng Place", async () => {
    const { result } = renderWithQuery(() => useDiscoverPlaces({ category: "all", query: "" }))

    await waitForQuery(() => expect(result.current.isSuccess).toBe(true))

    const places = result.current.data?.pages.flatMap((page) => page.items) ?? []
    expect(places.length).toBeGreaterThan(0)

    for (const place of places) {
      expect(typeof place.id).toBe("string")
      expect(typeof place.name).toBe("string")
      expect(VALID_CATEGORIES).toContain(place.category)
      expect(typeof place.rating).toBe("number")
    }
  })

  it("fetchNextPage tải trang kế tiếp theo cursor của mock (1.701 quán)", async () => {
    const { result } = renderWithQuery(() => useDiscoverPlaces({ category: "all", query: "" }))

    await waitForQuery(() => expect(result.current.isSuccess).toBe(true))
    // Mock trả 9 địa điểm/trang; còn 1.701 quán nên next !== null.
    expect(result.current.hasNextPage).toBe(true)
    const firstPageCount = result.current.data?.pages[0]?.items.length ?? 0
    expect(firstPageCount).toBe(9)

    await act(async () => {
      await result.current.fetchNextPage()
    })
    await waitForQuery(() => expect(result.current.data?.pages.length).toBe(2))

    const secondPage = result.current.data?.pages[1]
    expect(secondPage?.items.length).toBeGreaterThan(0)
    // Cursor phân trang: trang 2 không lặp lại id của trang 1.
    const firstIds = new Set(result.current.data?.pages[0]?.items.map((place) => place.id))
    for (const place of secondPage?.items ?? []) {
      expect(firstIds.has(place.id)).toBe(false)
    }
  })
})
