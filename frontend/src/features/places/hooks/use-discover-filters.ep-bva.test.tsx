import { act } from "@testing-library/react"
import { NuqsAdapter } from "nuqs/adapters/react-router/v8"
import { MemoryRouter, useLocation } from "react-router"
import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { ReactNode } from "react"
import { useDiscoverFilters } from "./use-discover-filters"

function renderFilters(initialUrl: string) {
  window.history.replaceState(null, "", initialUrl)
  return renderHook(
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
}

describe("useDiscoverFilters — EP & BVA (Phân vùng tương đương & Giá trị biên)", () => {
  describe("Phân tích giá trị biên (BVA) cho priceMax [1, 2, 3]", () => {
    it("giá trị biên hợp lệ nhỏ nhất: priceMax=1", () => {
      const { result } = renderFilters("/discover?priceMax=1")
      expect(result.current.filters.priceMax).toBe(1)
      expect(result.current.filters.activeFilterCount).toBe(1)
    })

    it("giá trị biên hợp lệ lớn nhất: priceMax=3", () => {
      const { result } = renderFilters("/discover?priceMax=3")
      expect(result.current.filters.priceMax).toBe(3)
      expect(result.current.filters.activeFilterCount).toBe(1)
    })

    it("giá trị sát dưới biên hợp lệ (0, số âm) → fallback 'all'", () => {
      const { result: r0 } = renderFilters("/discover?priceMax=0")
      expect(r0.current.filters.priceMax).toBe("all")

      const { result: rNeg } = renderFilters("/discover?priceMax=-1")
      expect(rNeg.current.filters.priceMax).toBe("all")
    })

    it("giá trị sát trên biên hợp lệ (4, 99999) → fallback 'all'", () => {
      const { result: r4 } = renderFilters("/discover?priceMax=4")
      expect(r4.current.filters.priceMax).toBe("all")

      const { result: rMax } = renderFilters("/discover?priceMax=999999")
      expect(rMax.current.filters.priceMax).toBe("all")
    })

    it("giá trị số thực / không nguyên (1.5, 2.99) → fallback 'all'", () => {
      const { result: rFloat } = renderFilters("/discover?priceMax=1.5")
      expect(rFloat.current.filters.priceMax).toBe("all")
    })
  })

  describe("Phân vùng tương đương (EP) cho query tham số lọc", () => {
    it("Lớp tương đương chuỗi rỗng / khoảng trắng cho q", () => {
      const { result } = renderFilters("/discover?q=%20%20%20")
      expect(result.current.filters.query.trim()).toBe("")
    })

    it("Lớp tương đương chuỗi dài cho q (> 100 ký tự)", () => {
      const longQuery = "a".repeat(120)
      const { result } = renderFilters(`/discover?q=${longQuery}`)
      expect(result.current.filters.query).toBe(longQuery)
    })

    it("Lớp tương đương category hợp lệ đơn lẻ", () => {
      const { result } = renderFilters("/discover?category=cafe")
      expect(result.current.filters.category).toBe("cafe")
      expect(result.current.filters.activeFilterCount).toBe(1)
    })

    it("Lớp tương đương category không thuộc enum (rác / không hợp lệ) → fallback 'all'", () => {
      const { result } = renderFilters("/discover?category=unknown_food_type")
      expect(result.current.filters.category).toBe("all")
    })

    it("Lớp tương đương district hợp lệ và rỗng", () => {
      const { result: rValid } = renderFilters("/discover?district=quan-1")
      expect(rValid.current.filters.district).toBe("quan-1")

      const { result: rEmpty } = renderFilters("/discover")
      expect(rEmpty.current.filters.district).toBe("all")
    })
  })

  describe("Bảng quyết định (Decision Table) cho tổ hợp Sort & Nearby", () => {
    it("DT1: sort=distance → isNearbyActive = true", () => {
      const { result } = renderFilters("/discover?sort=distance")
      expect(result.current.filters.sort).toBe("distance")
      expect(result.current.filters.isNearbyActive).toBe(true)
    })

    it("DT2: sort=newest → isNearbyActive = false", () => {
      const { result } = renderFilters("/discover?sort=newest")
      expect(result.current.filters.sort).toBe("newest")
      expect(result.current.filters.isNearbyActive).toBe(false)
    })

    it("DT3: sort=rating → isNearbyActive = false", () => {
      const { result } = renderFilters("/discover?sort=rating")
      expect(result.current.filters.sort).toBe("rating")
      expect(result.current.filters.isNearbyActive).toBe(false)
    })

    it("DT4: setIsNearbyActive(true) chuyển sort sang distance", () => {
      const { result } = renderFilters("/discover?sort=newest")
      expect(result.current.filters.isNearbyActive).toBe(false)

      act(() => {
        result.current.filters.setIsNearbyActive(true)
      })

      expect(result.current.filters.sort).toBe("distance")
      expect(result.current.filters.isNearbyActive).toBe(true)
    })

    it("DT5: setIsNearbyActive(false) khi đang distance chuyển về sort newest", () => {
      const { result } = renderFilters("/discover?sort=distance")
      expect(result.current.filters.isNearbyActive).toBe(true)

      act(() => {
        result.current.filters.setIsNearbyActive(false)
      })

      expect(result.current.filters.sort).toBe("newest")
      expect(result.current.filters.isNearbyActive).toBe(false)
    })
  })
})
