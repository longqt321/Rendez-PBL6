import { MapContainer, Marker } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { ExternalLinkIcon, MapPinIcon } from "lucide-react"
import { useIntersectionObserver } from "@uidotdev/usehooks"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { formatCoordinate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ResilientTileLayer } from "./resilient-tile-layer"
import { formatLocation } from "../lib/format-location"
import type { Place } from "../types/place"

interface PlaceMiniMapProps {
  place: Place
}

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

  // Mount bản đồ LƯƠI: chỉ dựng MapContainer khi khung nằm trong tầm nhìn
  // (useIntersectionObserver của @uidotdev/usehooks). Mini-map nằm dưới trang
  // chi tiết — không mount là không tải tile OSM dù user không cuộn tới.
  // `rootMargin` nới 200px để tile kịp sẵn trước khi khung hiện ra. Cuộn ra
  // ngoài thì unmount; cuộn lại tile lấy từ HTTP cache của trình duyệt
  // (max-age ~3,6 ngày — đã kiểm chứng bằng curl), không gọi lại OSM.
  const [observeRef, entry] = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.1,
    rootMargin: "200px",
  })
  const shouldRenderMap = entry?.isIntersecting === true

  if (place.lat === undefined || place.lng === undefined) {
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

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${place.name} ${place.address}`,
  )}`

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={observeRef}
        className="place-mini-map-frame relative h-64 w-full overflow-hidden rounded-xl border bg-muted shadow-sm"
      >
        {shouldRenderMap ? (
          <MapContainer
            key={place.id}
            center={position}
            zoom={16}
            scrollWheelZoom={false}
            className={cn("z-0 h-full w-full", isDark && "map-tiles-dark")}
          >
            <ResilientTileLayer />
            <Marker position={position} icon={createDetailMarkerIcon()} />
          </MapContainer>
        ) : null}

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
        <span>{formatLocation(place.address, place.city)}</span>
      </div>
    </div>
  )
}
