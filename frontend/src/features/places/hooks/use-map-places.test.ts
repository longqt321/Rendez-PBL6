import { describe, expect, it } from "vitest"
import type { DiscoverFilters } from "../api/get-places"
import { mapPlacesQueryKey, snapBounds } from "./use-map-places"

describe("snapBounds", () => {
  it("kéo nhẹ trong cùng ô lưới → cùng khung (cache hit)", () => {
    const base = { minLat: 16.0512, minLng: 108.2013, maxLat: 16.0648, maxLng: 108.2201 }
    const shifted = { ...base, minLat: base.minLat + 0.004, maxLat: base.maxLat + 0.004 }
    expect(snapBounds(shifted)).toEqual(snapBounds(base))
  })

  it("kéo xa qua ô lưới → khung khác (fetch vùng mới)", () => {
    const base = { minLat: 16.05, minLng: 108.2, maxLat: 16.06, maxLng: 108.21 }
    const far = { ...base, minLat: base.minLat + 0.05, maxLat: base.maxLat + 0.05 }
    expect(snapBounds(far)).not.toEqual(snapBounds(base))
  })

  it("nới khung 20% mỗi phía để pin sát mép không bị thiếu", () => {
    const snapped = snapBounds({ minLat: 16.0, minLng: 108.2, maxLat: 16.0, maxLng: 108.2 })
    expect(snapped.maxLat).toBeGreaterThan(snapped.minLat)
    expect(snapped.maxLng).toBeGreaterThan(snapped.minLng)
  })
})

describe("mapPlacesQueryKey", () => {
  const baseFilters: DiscoverFilters = {
    category: "cafe",
    district: "Hải Châu",
    query: "",
  }
  const bounds = { minLat: 16.05, minLng: 108.2, maxLat: 16.07, maxLng: 108.23 }

  it("đổi priceMax tạo queryKey khác để không dùng cache sai mức giá", () => {
    const kAll = mapPlacesQueryKey(baseFilters, bounds)
    const kLow = mapPlacesQueryKey({ ...baseFilters, priceMax: 1 }, bounds)
    const kMid = mapPlacesQueryKey({ ...baseFilters, priceMax: 2 }, bounds)

    expect(kLow).not.toEqual(kAll)
    expect(kMid).not.toEqual(kLow)
  })

  it("khi bounds=null dùng nhánh fit thay vì bbox cũ", () => {
    const kFit = mapPlacesQueryKey(baseFilters, null)
    const kBox = mapPlacesQueryKey(baseFilters, bounds)

    expect(kFit[2]).toBe("fit")
    expect(kFit).not.toEqual(kBox)
  })
})
