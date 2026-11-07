import { useEffect, useMemo, useRef } from "react"
import { Link } from "react-router"
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { ExternalLinkIcon, StarIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SeedImage } from "@/components/shared/seed-image"
import { CATEGORY_META } from "../lib/category-meta"
import type { Place } from "../types/place"

// Tọa độ mặc định (Trung tâm TP.HCM)
const DEFAULT_CENTER: [number, number] = [10.7769, 106.7009]
const DEFAULT_ZOOM = 13

interface PlacesMapProps {
  places: Place[]
  selectedPlaceId?: string | null
  onSelectPlace?: (place: Place) => void
  className?: string
  /** Chiều cao bản đồ (mặc định 100% hoặc giá trị h-...) */
  height?: string
}

/** Tự động căn chỉnh tầm nhìn bao quát các địa điểm */
function MapBoundsUpdater({ places, selectedPlace }: { places: Place[]; selectedPlace?: Place }) {
  const map = useMap()

  useEffect(() => {
    if (selectedPlace?.lat && selectedPlace?.lng) {
      map.flyTo([selectedPlace.lat, selectedPlace.lng], Math.max(map.getZoom(), 15), {
        duration: 0.8,
      })
      return
    }

    const validPlaces = places.filter((p) => p.lat !== undefined && p.lng !== undefined)
    if (validPlaces.length === 0) return

    if (validPlaces.length === 1) {
      const p = validPlaces[0]
      map.setView([p.lat!, p.lng!], 15)
      return
    }

    const bounds = L.latLngBounds(validPlaces.map((p) => [p.lat!, p.lng!]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
  }, [places, selectedPlace, map])

  return null
}

/** Tạo icon custom HTML cho Marker */
function createMarkerIcon(place: Place, isSelected: boolean) {
  const priceIndicator = "₫".repeat(place.priceLevel)
  const bgClass = isSelected
    ? "bg-primary text-primary-foreground ring-4 ring-primary/30 scale-110 z-50"
    : "bg-card text-card-foreground border border-border shadow-md hover:scale-105 hover:bg-accent"

  const html = `
    <div class="relative flex items-center justify-center transition-transform duration-200 cursor-pointer">
      <div class="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${bgClass}">
        <span class="inline-block size-2 rounded-full bg-primary ${isSelected ? "bg-background" : ""}"></span>
        <span class="truncate max-w-[120px]">${place.name}</span>
        <span class="text-[10px] opacity-75">${priceIndicator}</span>
      </div>
      <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${isSelected ? "bg-primary" : "bg-card border-r border-b border-border"}"></div>
    </div>
  `

  return L.divIcon({
    html,
    className: "custom-place-marker",
    iconSize: [140, 36],
    iconAnchor: [70, 36],
    popupAnchor: [0, -36],
  })
}

export function PlacesMap({
  places,
  selectedPlaceId,
  onSelectPlace,
  className = "",
  height = "h-[650px]",
}: PlacesMapProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const markerRefs = useRef<Record<string, L.Marker | null>>({})

  const validPlaces = useMemo(
    () => places.filter((p) => p.lat !== undefined && p.lng !== undefined),
    [places],
  )

  const selectedPlace = useMemo(
    () => validPlaces.find((p) => p.id === selectedPlaceId),
    [validPlaces, selectedPlaceId],
  )

  // Mở popup khi selectedPlaceId thay đổi
  useEffect(() => {
    if (selectedPlaceId && markerRefs.current[selectedPlaceId]) {
      const marker = markerRefs.current[selectedPlaceId]
      if (marker && !marker.isPopupOpen()) {
        marker.openPopup()
      }
    }
  }, [selectedPlaceId])

  // OpenStreetMap Tile URL tuỳ biến nhẹ theo theme
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

  const attribution = isDark
    ? '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border bg-muted shadow-inner ${height} ${className}`}
    >
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        className="z-0 h-full w-full"
      >
        <TileLayer attribution={attribution} url={tileUrl} />
        <MapBoundsUpdater places={validPlaces} selectedPlace={selectedPlace} />

        {validPlaces.map((place) => {
          const isSelected = place.id === selectedPlaceId
          const icon = createMarkerIcon(place, isSelected)

          return (
            <Marker
              key={place.id}
              position={[place.lat!, place.lng!]}
              icon={icon}
              ref={(ref) => {
                markerRefs.current[place.id] = ref
              }}
              eventHandlers={{
                click: () => {
                  onSelectPlace?.(place)
                },
              }}
            >
              <Popup className="place-popup" closeButton={false}>
                <div className="flex max-w-[260px] min-w-[220px] flex-col gap-2 p-1">
                  <div className="relative h-28 w-full overflow-hidden rounded-md bg-muted">
                    <SeedImage
                      seed={place.imageSeed}
                      height={112}
                      alt={place.name}
                      className="h-full w-full object-cover"
                    />
                    <Badge variant="secondary" className="absolute top-2 left-2 text-[10px]">
                      {CATEGORY_META[place.category]?.label}
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-1">
                    <h4 className="line-clamp-1 font-heading text-sm leading-tight font-bold text-foreground">
                      {place.name}
                    </h4>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{place.address}</p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                        <StarIcon className="size-3.5 fill-current" />
                        {place.rating.toFixed(1)}
                        <span className="text-[10px] font-normal text-muted-foreground">
                          ({place.reviewCount})
                        </span>
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {"₫".repeat(place.priceLevel)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      size="sm"
                      className="h-7 w-full text-xs"
                      render={<Link to={`/discover/${place.id}`} />}
                    >
                      Xem quán
                      <ExternalLinkIcon className="ml-1 size-3" />
                    </Button>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Tóm tắt số lượng địa điểm trên bản đồ */}
      <div className="absolute bottom-3 left-3 z-[1000] rounded-md border bg-background/90 px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur">
        Đang hiển thị {validPlaces.length} địa điểm
      </div>
    </div>
  )
}
