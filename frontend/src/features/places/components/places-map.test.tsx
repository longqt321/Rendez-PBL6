import type { ReactNode } from "react"
import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PlacesMap } from "./places-map"
import type { Place } from "../types/place"

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}))

// Mock react-router
vi.mock("react-router", () => ({
  Link: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}))

interface MockMarkerProps {
  children?: ReactNode
  icon?: { options?: { html?: string } }
  title?: string
  alt?: string
  keyboard?: boolean
  eventHandlers?: {
    keydown?: (event: { originalEvent: unknown }) => void
    click?: (event: unknown) => void
  }
}

// Mock react-leaflet
vi.mock("react-leaflet", () => {
  return {
    MapContainer: ({ children }: { children: ReactNode }) => (
      <div data-testid="map-container">{children}</div>
    ),
    TileLayer: () => <div data-testid="tile-layer" />,
    Marker: ({
      children,
      icon,
      title,
      alt,
      keyboard,
      eventHandlers,
      ...props
    }: MockMarkerProps) => (
      <div
        data-testid="map-marker"
        data-title={title}
        data-alt={alt}
        data-keyboard={String(keyboard)}
        tabIndex={0}
        role="button"
        aria-label={title || alt}
        onKeyDown={(e) => {
          eventHandlers?.keydown?.({
            originalEvent: e,
          })
        }}
        onClick={(e) => {
          eventHandlers?.click?.(e)
        }}
        {...props}
      >
        <div dangerouslySetInnerHTML={{ __html: icon?.options?.html || "" }} />
        {children}
      </div>
    ),
    Popup: ({ children }: { children: ReactNode }) => <div data-testid="map-popup">{children}</div>,
    useMap: () => ({
      flyTo: vi.fn(),
      getZoom: () => 13,
      getBounds: () => ({
        getWest: () => 108.1,
        getSouth: () => 16.0,
        getEast: () => 108.3,
        getNorth: () => 16.1,
      }),
      latLngToContainerPoint: () => ({ x: 100, y: 100 }),
      latLngToLayerPoint: () => ({ x: 100, y: 100 }),
      layerPointToLatLng: () => ({ lat: 16.07, lng: 108.22 }),
      fitBounds: vi.fn(),
    }),
    useMapEvents: vi.fn(),
  }
})

const MOCK_PLACES: Place[] = [
  {
    id: "place-1",
    name: "Cà phê Long",
    address: "123 Quang Trung",
    city: "Đà Nẵng",
    category: "cafe",
    tags: [],
    positiveRatio: 90,
    reviewCount: 150,
    priceLevel: 1,
    imageHeight: 320,
    publishedAt: "2026-11-09T08:00:00+07:00",
    lat: 16.07,
    lng: 108.22,
  },
  {
    id: "place-2",
    name: "Bánh Xèo Bà Dưỡng",
    address: "K280/23 Hoàng Diệu",
    city: "Đà Nẵng",
    category: "restaurant",
    tags: [],
    positiveRatio: 90,
    reviewCount: 320,
    priceLevel: 2,
    imageHeight: 320,
    publishedAt: "2026-11-09T08:00:00+07:00",
    lat: 16.06,
    lng: 108.21,
  },
]

describe("PlacesMap marker keyboard accessibility", () => {
  it("render markers với title, alt và keyboard: true cho các địa điểm", () => {
    const { getAllByTestId } = render(<PlacesMap places={MOCK_PLACES} />)
    const markers = getAllByTestId("map-marker")

    expect(markers.length).toBeGreaterThanOrEqual(1)
    const placeMarker = markers.find((m) => m.getAttribute("data-title") === "Cà phê Long")
    expect(placeMarker).toBeDefined()
    expect(placeMarker?.getAttribute("data-alt")).toBe("Cà phê Long")
    expect(placeMarker?.getAttribute("data-keyboard")).toBe("true")
  })

  it("không lồng role='button' hay tabindex bên trong divIcon (mỗi marker chỉ 1 điểm dừng Tab)", () => {
    const { getAllByTestId } = render(<PlacesMap places={MOCK_PLACES} />)
    const markers = getAllByTestId("map-marker")
    const placeMarker = markers.find((m) => m.getAttribute("data-title") === "Cà phê Long")

    expect(placeMarker?.firstElementChild?.querySelector('[role="button"], [tabindex]')).toBeNull()
    expect(placeMarker?.getAttribute("aria-label")).toBe("Cà phê Long")
  })

  it("gọi onSelectPlace khi người dùng nhấn Enter hoặc Space trên marker", () => {
    const onSelectPlace = vi.fn()
    const { getAllByTestId } = render(
      <PlacesMap places={MOCK_PLACES} onSelectPlace={onSelectPlace} />,
    )
    const markers = getAllByTestId("map-marker")
    const placeMarker = markers.find((m) => m.getAttribute("data-title") === "Cà phê Long")
    expect(placeMarker).toBeDefined()

    // Nhấn Enter
    const enterEvent = new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    const preventDefaultEnter = vi.spyOn(enterEvent, "preventDefault")
    placeMarker?.dispatchEvent(enterEvent)
    expect(onSelectPlace).toHaveBeenCalledWith(MOCK_PLACES[0])
    expect(preventDefaultEnter).toHaveBeenCalled()

    // Nhấn Space
    const spaceEvent = new KeyboardEvent("keydown", { key: " ", bubbles: true })
    const preventDefaultSpace = vi.spyOn(spaceEvent, "preventDefault")
    placeMarker?.dispatchEvent(spaceEvent)
    expect(onSelectPlace).toHaveBeenCalledTimes(2)
    expect(preventDefaultSpace).toHaveBeenCalled()
  })
})
