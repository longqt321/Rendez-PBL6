import { act, waitFor } from "@testing-library/react"
import { MemoryRouter, useLocation } from "react-router"
import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { ReactNode } from "react"
import { useDiscoverFilters } from "./use-discover-filters"

/**
 * Bộ lọc lưu trên URL nên test bọc `MemoryRouter`. Đọc URL hiện hành bằng
 * `useLocation` TRONG cùng component callback (wrapper của `renderHook` không
 * được render gì ngoài `{children}` — thêm sibling làm hook không commit).
 */
function renderFilters(initialUrl: string) {
  const result = renderHook(
    () => ({
      filters: useDiscoverFilters(),
      search: useLocation().search,
    }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
      ),
    },
  )
  return result
}

describe("useDiscoverFilters — priceMax & sort", () => {
  it("đọc ?priceMax=2&sort=rating đúng state", () => {
    const { result } = renderFilters("/discover?priceMax=2&sort=rating")
    expect(result.current.filters.priceMax).toBe(2)
    expect(result.current.filters.sort).toBe("rating")
    expect(result.current.filters.isNearbyActive).toBe(false)
    expect(result.current.filters.activeFilterCount).toBe(1)
  })

  it("giá trị rác → mặc định (all / newest)", () => {
    const { result } = renderFilters("/discover?priceMax=9&sort=tuyet-voi")
    expect(result.current.filters.priceMax).toBe("all")
    expect(result.current.filters.sort).toBe("newest")
  })

  it("?nearby=1 (link cũ) → sort=distance, nearby bị xoá khỏi URL sau chuẩn hoá", async () => {
    const { result } = renderFilters("/discover?nearby=1")
    expect(result.current.filters.sort).toBe("distance")
    expect(result.current.filters.isNearbyActive).toBe(true)
    await waitFor(() => expect(result.current.search).not.toContain("nearby"))
    expect(result.current.search).toContain("sort=distance")
  })

  it("?nearby=1&sort=rating → sort thắng, nearby bị bỏ", async () => {
    const { result } = renderFilters("/discover?nearby=1&sort=rating")
    expect(result.current.filters.sort).toBe("rating")
    expect(result.current.filters.isNearbyActive).toBe(false)
    await waitFor(() => expect(result.current.search).not.toContain("nearby"))
  })

  it("tắt 'Gần đây' → sort về newest (không nhớ sort cũ)", () => {
    const { result } = renderFilters("/discover?sort=distance")
    expect(result.current.filters.isNearbyActive).toBe(true)
    act(() => result.current.filters.setIsNearbyActive(false))
    expect(result.current.filters.sort).toBe("newest")
    expect(result.current.filters.isNearbyActive).toBe(false)
  })

  it("setSort('distance') ghi sort=distance và xoá nearby", async () => {
    const { result } = renderFilters("/discover?nearby=1")
    act(() => result.current.filters.setSort("distance"))
    await waitFor(() => expect(result.current.search).toContain("sort=distance"))
    expect(result.current.search).not.toContain("nearby")
  })

  it("setPriceMax ghi priceMax lên URL; 'all' xoá khỏi URL", async () => {
    const { result } = renderFilters("/discover")
    act(() => result.current.filters.setPriceMax(3))
    await waitFor(() => expect(result.current.search).toContain("priceMax=3"))
    act(() => result.current.filters.setPriceMax("all"))
    await waitFor(() => expect(result.current.search).not.toContain("priceMax"))
  })

  it("resetAll xoá cả sort, priceMax và nearby", async () => {
    const { result } = renderFilters("/discover?priceMax=2&sort=distance&nearby=1")
    act(() => result.current.filters.resetAll())
    await waitFor(() => expect(result.current.search).toBe(""))
    expect(result.current.filters.priceMax).toBe("all")
    expect(result.current.filters.sort).toBe("newest")
  })
})
