import { MapContainer, Marker, TileLayer } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { ExternalLinkIcon, MapPinIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { formatCoordinate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Place } from "../types/place"

interface PlaceMiniMapProps {
  place: Place
}

/**
 * Pin của lucide `MapPin` dạng chuỗi SVG.
 *
 * Leaflet `divIcon` chỉ nhận chuỗi HTML nên không render JSX được ở đây; dựng
 * chuỗi SVG thủ công (cùng cách `places-map.tsx` làm) thay vì kéo `react-dom/server`
 * vào bundle trình duyệt. `currentColor` ăn theo `text-primary-foreground` của khung.
 */
const MAP_PIN_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </svg>
`

function createDetailMarkerIcon() {
  const html = `
    <div class="relative flex items-center justify-center">
      <div class="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg ring-4 ring-primary/20 animate-bounce">
        ${MAP_PIN_SVG}
      </div>
    </div>
  `

  return L.divIcon({
    html,
    className: "detail-place-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  })
}

export function PlaceMiniMap({ place }: PlaceMiniMapProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  if (!place.lat || !place.lng) {
    return (
      <Empty className="h-56 w-full flex-none border bg-muted">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MapPinIcon />
          </EmptyMedia>
          <EmptyTitle>Chưa có tọa độ bản đồ cho địa điểm này</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  const position: [number, number] = [place.lat, place.lng]
  // OpenStreetMap Tile tiêu chuẩn hoàn toàn miễn phí, 100% không cần API key
  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${place.name} ${place.address}`,
  )}`

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-64 w-full overflow-hidden rounded-xl border bg-muted shadow-sm">
        <MapContainer
          center={position}
          zoom={16}
          scrollWheelZoom={false}
          className={cn("z-0 h-full w-full", isDark && "map-tiles-dark")}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={tileUrl}
          />
          <Marker position={position} icon={createDetailMarkerIcon()} />
        </MapContainer>

        <Button
          size="sm"
          variant="secondary"
          className="absolute right-3 bottom-3 z-1000 shadow-md backdrop-blur"
          render={<a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" />}
        >
          <ExternalLinkIcon className="mr-1 size-3.5" />
          Mở chỉ đường Google Maps
        </Button>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Tọa độ: {formatCoordinate(place.lat)}, {formatCoordinate(place.lng)}
        </span>
        <span>
          {place.address}, {place.city}
        </span>
      </div>
    </div>
  )
}
