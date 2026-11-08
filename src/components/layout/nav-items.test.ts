import { describe, expect, it } from "vitest"
import { FILTER_SHARED_PATHS, NAV_ITEMS } from "./nav-items"

describe("NAV_ITEMS", () => {
  it("mỗi mục đều có nhãn, icon và đường dẫn tuyệt đối", () => {
    for (const item of NAV_ITEMS) {
      expect(item.label.length).toBeGreaterThan(0)
      expect(item.to.startsWith("/")).toBe(true)
    }
  })

  it("FILTER_SHARED_PATHS khớp đúng các mục sharesFilters", () => {
    expect(FILTER_SHARED_PATHS).toEqual(
      NAV_ITEMS.filter((item) => item.sharesFilters).map((item) => item.to),
    )
  })

  it("không có mục nav trùng đường dẫn", () => {
    const paths = NAV_ITEMS.map((item) => item.to)
    expect(new Set(paths).size).toBe(paths.length)
  })
})
