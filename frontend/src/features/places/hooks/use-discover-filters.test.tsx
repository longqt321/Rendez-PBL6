import { act, waitFor } from "@testing-library/react"
import { NuqsAdapter } from "nuqs/adapters/react-router/v8"
import { MemoryRouter, useLocation } from "react-router"
import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { ReactNode } from "react"
import { useDiscoverFilters } from "./use-discover-filters"

function renderFilters(initialUrl: string) {
  window.history.replaceState(null, "", initialUrl)
  const result = renderHook(
    () => ({
      filters: useDiscoverFilters(),
      search: useLocation().search,
    }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MemoryRouter initialEntries={[initialUrl]}>
          <NuqsAdapter>{children}</NuqsAdapter>
        </MemoryRouter>
      ),
    },
  )
  return result
}

describe("useDiscoverFilters - Smart Search & Filter state", () => {
  it("đọc ?priceMax=2&sort=rating đúng state", () => {
    const { result } = renderFilters("/discover?priceMax=2&sort=rating")
    expect(result.current.filters.priceMax).toBe(2)
    expect(result.current.filters.sort).toBe("rating")
    expect(result.current.filters.isNearbyActive).toBe(false)
    expect(result.current.filters.activeFilterCount).toBe(1)
  })

  it("giá trị rác -> mặc định (all / newest)", () => {
    const { result } = renderFilters("/discover?priceMax=9&sort=tuyet-voi")
    expect(result.current.filters.priceMax).toBe("all")
    expect(result.current.filters.sort).toBe("newest")
  })

  it("tắt 'Gần tôi' -> sort về newest", () => {
    const { result } = renderFilters("/discover?sort=distance")
    expect(result.current.filters.isNearbyActive).toBe(true)
    act(() => result.current.filters.setIsNearbyActive(false))
    expect(result.current.filters.sort).toBe("newest")
    expect(result.current.filters.isNearbyActive).toBe(false)
  })

  it("parsedQuery bóc đúng thuộc tính tự nhiên và removeParsedChip gỡ chính xác khỏi URL", async () => {
    const { result } = renderFilters(
      "/discover?q=" + encodeURIComponent("cà phê ở Sơn Trà dưới 50k"),
    )
    expect(result.current.filters.parsedQuery.categories).toEqual(["cafe"])
    expect(result.current.filters.parsedQuery.districts).toEqual(["Sơn Trà"])
    expect(result.current.filters.parsedQuery.priceMax).toBe(1)
    expect(result.current.filters.parsedQuery.residualQuery).toBe("")

    const districtChip = result.current.filters.parsedQuery.chips.find(
      (c) => c.field === "district",
    )
    expect(districtChip).toBeDefined()

    act(() => result.current.filters.removeParsedChip(districtChip!))
    await waitFor(() => expect(result.current.filters.query).not.toContain("Sơn Trà"))
    expect(result.current.filters.parsedQuery.districts).toEqual([])
    expect(result.current.filters.parsedQuery.categories).toEqual(["cafe"])
  })

  it("commitQueryNow ghi ngay q lên URL mà không cần đợi debounce", async () => {
    const { result } = renderFilters("/discover")
    act(() => result.current.filters.commitQueryNow("bánh xèo Hải Châu"))
    await waitFor(() =>
      expect(new URLSearchParams(result.current.search).get("q")).toBe("bánh xèo Hải Châu"),
    )
  })

  it("setPriceMax ghi priceMax lên URL; 'all' xoá khỏi URL", async () => {
    const { result } = renderFilters("/discover")
    act(() => result.current.filters.setPriceMax(3))
    await waitFor(() => expect(result.current.search).toContain("priceMax=3"))
    act(() => result.current.filters.setPriceMax("all"))
    await waitFor(() => expect(result.current.search).not.toContain("priceMax"))
  })

  it("resetAll xoá toàn bộ query, sort, priceMax", async () => {
    const { result } = renderFilters("/discover?q=cafe&priceMax=2&sort=distance")
    act(() => result.current.filters.resetAll())
    await waitFor(() => expect(result.current.search).toBe(""))
    expect(result.current.filters.priceMax).toBe("all")
    expect(result.current.filters.sort).toBe("newest")
    expect(result.current.filters.query).toBe("")
  })
})
