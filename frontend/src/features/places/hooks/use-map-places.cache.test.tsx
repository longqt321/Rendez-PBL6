import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { MapBounds } from "../api/get-map-places"

vi.mock("../api/get-map-places", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/get-map-places")>()
  return { ...actual, getMapPlaces: vi.fn(actual.getMapPlaces) }
})

const { getMapPlaces } = await import("../api/get-map-places")
const getMapPlacesMock = vi.mocked(getMapPlaces)

const { useMapPlaces } = await import("./use-map-places")

const FILTERS = { category: "all" as const, query: "" }
const AREA_A: MapBounds = { minLat: 16.03, minLng: 108.19, maxLat: 16.09, maxLng: 108.25 }
// Lệch 0,002° — sau khi làm tròn lưới 0,01° vẫn ra cùng khung ⇒ dùng lại cache.
const AREA_A_SHIFTED: MapBounds = { ...AREA_A, minLat: 16.032, maxLat: 16.092 }
// Cách xa (Sơn Trà) ⇒ vùng mới, phải gọi API.
const AREA_B: MapBounds = { minLat: 16.09, minLng: 108.24, maxLat: 16.15, maxLng: 108.3 }

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe("useMapPlaces", () => {
  beforeEach(() => {
    getMapPlacesMock.mockReset()
    getMapPlacesMock.mockResolvedValue({ items: [], total: 0 })
  })

  it("kéo nhẹ trong cùng ô lưới và quay lại vùng cũ → không gọi lại API", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result, rerender } = renderHook(
      ({ bounds }: { bounds: MapBounds }) => useMapPlaces(FILTERS, bounds),
      { wrapper: wrapper(client), initialProps: { bounds: AREA_A } },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getMapPlacesMock).toHaveBeenCalledTimes(1)

    // Kéo nhẹ: cùng ô lưới sau khi làm tròn → cache hit.
    rerender({ bounds: AREA_A_SHIFTED })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(getMapPlacesMock).toHaveBeenCalledTimes(1)

    // Sang vùng khác: phải gọi API.
    rerender({ bounds: AREA_B })
    await waitFor(() => expect(getMapPlacesMock).toHaveBeenCalledTimes(2))

    // Quay lại vùng đầu: cache còn (gcTime 10 phút) → không gọi lại.
    rerender({ bounds: AREA_A })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(getMapPlacesMock).toHaveBeenCalledTimes(2)
  })

  it("chưa có khung nhìn thì không gọi API", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderHook(() => useMapPlaces(FILTERS, null), { wrapper: wrapper(client) })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(getMapPlacesMock).not.toHaveBeenCalled()
  })
})
