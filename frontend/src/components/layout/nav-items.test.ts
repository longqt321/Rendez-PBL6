import { describe, expect, it } from "vitest"
import { FILTER_SHARED_PATHS, MOBILE_NAV_ITEMS, NAV_ITEMS } from "./nav-items"

describe("NAV_ITEMS & MOBILE_NAV_ITEMS", () => {
  it("mỗi mục đều có nhãn, icon và đường dẫn tuyệt đối", () => {
    for (const item of [...NAV_ITEMS, ...MOBILE_NAV_ITEMS]) {
      expect(item.label.length).toBeGreaterThan(0)
      expect(item.to.startsWith("/")).toBe(true)
    }
  })

  it("FILTER_SHARED_PATHS khớp đúng các mục sharesFilters", () => {
    expect(FILTER_SHARED_PATHS).toEqual(
      NAV_ITEMS.filter((item) => item.sharesFilters).map((item) => item.to),
    )
  })

  it("không có mục nav trùng đường dẫn trong từng danh sách", () => {
    const desktopPaths = NAV_ITEMS.map((item) => item.to)
    expect(new Set(desktopPaths).size).toBe(desktopPaths.length)

    const mobilePaths = MOBILE_NAV_ITEMS.map((item) => item.to)
    expect(new Set(mobilePaths).size).toBe(mobilePaths.length)
  })

  it("thanh điều hướng chính và di động có đầy đủ mục Đã lưu (/saved) và Hồ sơ (/profile)", () => {
    expect(MOBILE_NAV_ITEMS.some((item) => item.to === "/saved")).toBe(true)
    expect(NAV_ITEMS.some((item) => item.to === "/saved")).toBe(true)
    expect(NAV_ITEMS.some((item) => item.to === "/profile")).toBe(true)
  })
})
