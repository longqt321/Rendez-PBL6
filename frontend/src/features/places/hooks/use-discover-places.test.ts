import { act } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { discoverQueryKey, useDiscoverPlaces } from "./use-discover-places"
import { placesQueryParams } from "../api/get-places"
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

// ---------------------------------------------------------------------------
// Query key phải chứa sort/priceMax/toạ độ (thiết kế mục 4.3.1) — thiếu một
// trường là react-query nối trang 1 vào `pages` cũ → card nhân đôi khi đổi sort.
// ---------------------------------------------------------------------------
describe("discoverQueryKey", () => {
  const base = { category: "all" as const, query: "" }

  it("đổi sort → key khác", () => {
    expect(discoverQueryKey({ ...base, sort: "rating" })).not.toEqual(
      discoverQueryKey({ ...base, sort: "newest" }),
    )
    expect(discoverQueryKey({ ...base, sort: "distance" })).not.toEqual(
      discoverQueryKey({ ...base, sort: "rating" }),
    )
  })

  it("đổi priceMax cá nhân → key khác", () => {
    expect(discoverQueryKey({ ...base, priceMax: 2 })).not.toEqual(
      discoverQueryKey({ ...base, priceMax: 3 }),
    )
    expect(discoverQueryKey({ ...base, priceMax: 2 })).not.toEqual(discoverQueryKey(base))
  })

  it("toạ độ nhích < 0,0001° → key KHÔNG đổi (chống GPS jitter)", () => {
    const a = discoverQueryKey({
      ...base,
      sort: "distance",
      coords: { lat: 16.06123, lng: 108.22123 },
    })
    const b = discoverQueryKey({
      ...base,
      sort: "distance",
      coords: { lat: 16.06124, lng: 108.22124 },
    })
    expect(a).toEqual(b)
  })

  it("toạ độ khác ≥ 4 chữ số thập phân → key khác", () => {
    const a = discoverQueryKey({
      ...base,
      sort: "distance",
      coords: { lat: 16.0612, lng: 108.2212 },
    })
    const b = discoverQueryKey({
      ...base,
      sort: "distance",
      coords: { lat: 16.0712, lng: 108.2212 },
    })
    expect(a).not.toEqual(b)
  })
})

describe("placesQueryParams", () => {
  it("phòng có priceMax thắng filter giá cá nhân", () => {
    const params = placesQueryParams({
      category: "all",
      query: "",
      priceMax: 1,
      room: {
        categories: [],
        excludedCategories: [],
        districts: [],
        excludedDistricts: [],
        includeKeywords: [],
        excludeKeywords: [],
        priceMax: 3,
      },
    })
    expect(params.priceMax).toBe(3)
  })

  it("sort=distance gửi kèm lat/lng; sort khác không gửi toạ độ", () => {
    const distance = placesQueryParams({
      category: "all",
      query: "",
      sort: "distance",
      coords: { lat: 16.06, lng: 108.22 },
    })
    expect(distance.sort).toBe("distance")
    expect(distance.lat).toBe(16.06)
    expect(distance.lng).toBe(108.22)

    const newest = placesQueryParams({
      category: "all",
      query: "",
      sort: "newest",
      coords: { lat: 16.06, lng: 108.22 },
    })
    expect(newest.sort).toBeUndefined()
    expect(newest.lat).toBeUndefined()
  })
})
