import { describe, expect, it, vi } from "vitest"
import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { Place } from "../types/place"
import { getRecommendedPlaces } from "./get-recommended-places"

/**
 * Test hàm api chạy với `api.get` bị spy — không mock module, interceptor của
 * axios thật vẫn chạy. Endpoint `/places/recommended` do backend bổ sung sau
 * nên hợp đồng test là: 200 có items / 200 rỗng / lỗi (404…) → `[]`.
 */

/** Fixture tối thiểu khớp `Place` — test chỉ quan tâm số lượng và id. */
function makePlace(id: string): Place {
  return {
    id,
    name: `Quán ${id}`,
    address: "123 Đường Test",
    city: "Đà Nẵng",
    category: "cafe",
    tags: [],
    rating: 4.5,
    reviewCount: 10,
    priceLevel: 2,
    imageHeight: 400,
    publishedAt: null,
  }
}

function page(items: Place[]): Page<Place> {
  return { items, next: null, meta: { tookMs: 1, cacheHit: false, totalResults: items.length } }
}

describe("getRecommendedPlaces", () => {
  it("gọi đúng endpoint + limit và trả items khi 200", async () => {
    const spy = vi.spyOn(api, "get").mockResolvedValue({
      data: page([makePlace("p1"), makePlace("p2")]),
    })

    const items = await getRecommendedPlaces(6)

    expect(spy).toHaveBeenCalledWith(
      "/places/recommended",
      expect.objectContaining({
        params: { limit: 6 },
      }),
    )
    expect(items.map((item) => item.id)).toEqual(["p1", "p2"])

    spy.mockRestore()
  })

  it("trả mảng rỗng khi 200 nhưng không có items", async () => {
    const spy = vi.spyOn(api, "get").mockResolvedValue({ data: page([]) })

    await expect(getRecommendedPlaces()).resolves.toEqual([])

    spy.mockRestore()
  })

  it("trả mảng rỗng khi endpoint lỗi (404 chưa tồn tại)", async () => {
    const spy = vi.spyOn(api, "get").mockRejectedValue(new Error("404"))

    await expect(getRecommendedPlaces()).resolves.toEqual([])

    spy.mockRestore()
  })
})
