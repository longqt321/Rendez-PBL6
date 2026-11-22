import { describe, expect, it } from "vitest"
import { ADMIN_URL_PARSERS, CLEAR_ALL_ADMIN_FILTERS } from "./admin-url-params"

describe("admin-url-params — Chống rò rỉ Query Params giữa các Tab (L-063)", () => {
  it("CLEAR_ALL_ADMIN_FILTERS bao phủ 100% mọi parser lọc ngoài `tab` và đều đặt về null", () => {
    const filterKeys = Object.keys(ADMIN_URL_PARSERS)
      .filter((k) => k !== "tab")
      .sort()
    const clearKeys = Object.keys(CLEAR_ALL_ADMIN_FILTERS).sort()

    expect(clearKeys).toEqual(filterKeys)
    for (const val of Object.values(CLEAR_ALL_ADMIN_FILTERS)) {
      expect(val).toBeNull()
    }
  })

  it("parser từ chối giá trị lạ / injection và fallback sạch về default", () => {
    expect(ADMIN_URL_PARSERS.tab.parse("invalid_tab")).toBeNull()
    expect(ADMIN_URL_PARSERS.pCat.parse("drop_table")).toBeNull()
    expect(ADMIN_URL_PARSERS.pVis.parse("secret")).toBeNull()
    expect(ADMIN_URL_PARSERS.uRole.parse("superadmin")).toBeNull()
    expect(ADMIN_URL_PARSERS.obsKind.parse("sql_dump")).toBeNull()

    expect(ADMIN_URL_PARSERS.tab.parse("places")).toBe("places")
    expect(ADMIN_URL_PARSERS.obsKind.parse("web_vital")).toBe("web_vital")
  })
})
