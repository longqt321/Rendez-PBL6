import { describe, expect, it } from "vitest"
import { snapBounds } from "./use-map-places"

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
