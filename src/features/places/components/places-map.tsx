import { useEffect, useMemo, useRef } from "react"
import { Link } from "react-router"
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { ExternalLinkIcon, NavigationIcon, StarIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CoverImage } from "@/components/shared/cover-image"
import { placeImageAlt } from "@/components/shared/place-image-alt"
import { CATEGORY_META } from "../lib/category-meta"
import { formatDistance, formatRating } from "@/lib/format"
import { calculateDistanceKm } from "../lib/danang-districts"
import { priceLevelLabel } from "../lib/price-level"
import { cn } from "@/lib/utils"
import { DANANG_CENTER_TUPLE, DANANG_DEFAULT_ZOOM } from "@/lib/constants"
import type { MapBounds } from "../api/get-map-places"
import type { Place } from "../types/place"

interface PlacesMapProps {
  places: Place[]
  selectedPlaceId?: string | null
  onSelectPlace?: (place: Place) => void
  userCoordinates?: { lat: number; lng: number } | null
  className?: string
  /** Chiều cao bản đồ (mặc định 100% hoặc giá trị h-...) */
  height?: string
  /**
   * Báo khung nhìn sau khi người dùng pan/zoom xong (đã debounce). Có callback
   * này thì bản đồ tự nạp pin theo vùng đang xem.
   */
  onViewportChange?: (bounds: MapBounds) => void
  /**
   * Đổi giá trị này để yêu cầu căn lại tầm nhìn (ví dụ khi đổi bộ lọc). Không
   * truyền thì bản đồ chỉ căn một lần lúc mở.
   */
  fitKey?: string
  /** Đang tải pin của vùng xem — nhãn đếm đổi thành trạng thái đang tải. */
  isPlacesLoading?: boolean
}

/**
 * Căn tầm nhìn bao quát các địa điểm — CHỈ khi `fitKey` đổi (mở bản đồ, đổi bộ
 * lọc, bật vị trí). Trước đây nó chạy lại mỗi lần danh sách địa điểm đổi, tạo
 * vòng lặp: căn lại → khung nhìn đổi → nạp vùng mới → căn lại…
 */
function MapBoundsUpdater({
  places,
  selectedPlace,
  userCoordinates,
  fitKey,
}: {
  places: Place[]
  selectedPlace?: Place
  userCoordinates?: { lat: number; lng: number } | null
  fitKey?: string
  /** Đang tải pin của vùng xem — nhãn đếm đổi thành trạng thái đang tải. */
  isPlacesLoading?: boolean
}) {
  const map = useMap()

  useEffect(() => {
    if (selectedPlace?.lat && selectedPlace?.lng) {
      map.flyTo([selectedPlace.lat, selectedPlace.lng], Math.max(map.getZoom(), 15), {
        duration: 0.8,
      })
      return
    }

    const validPlaces = places.filter((p) => p.lat !== undefined && p.lng !== undefined)
    const points: [number, number][] = validPlaces.map((p) => [p.lat!, p.lng!])
    if (userCoordinates) {
      points.push([userCoordinates.lat, userCoordinates.lng])
    }

    if (points.length === 0) return

    if (points.length === 1) {
      map.setView(points[0], 15)
      return
    }

    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
    // Cố ý KHÔNG phụ thuộc `places`: chỉ căn lại khi `fitKey` đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, selectedPlace, userCoordinates, map])

  return null
}

/**
 * Báo khung nhìn hiện tại sau khi người dùng ngừng pan/zoom.
 *
 * Debounce 300ms: `moveend` bắn liên tục khi kéo bản đồ, gọi API mỗi lần sẽ tạo
 * hàng chục request thừa. Debounce bằng `setTimeout` (không cần package) vì đây
 * là điều phối sự kiện của Leaflet, không phải logic nghiệp vụ.
 */
function ViewportReporter({ onChange }: { onChange: (bounds: MapBounds) => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const report = (map: L.Map) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const b = map.getBounds()
      onChange({
        minLat: b.getSouth(),
        minLng: b.getWest(),
        maxLat: b.getNorth(),
        maxLng: b.getEast(),
      })
    }, 300)
  }

  const map = useMapEvents({
    moveend: () => report(map),
    zoomend: () => report(map),
  })

  // Báo khung nhìn ban đầu để lần mở đầu tiên cũng nạp theo vùng thật.
  useEffect(() => {
    report(map)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  return null
}

/**
 * Tạo icon custom HTML cho Marker quán ăn.
 * Leaflet `divIcon` chỉ nhận chuỗi HTML — không render JSX ở đây được.
 */
function createMarkerIcon(place: Place, isSelected: boolean, distanceKm?: number) {
  const priceIndicator = priceLevelLabel(place.priceLevel)
  const bgClass = isSelected
    ? "bg-primary text-primary-foreground ring-4 ring-primary/30 scale-110 z-50"
    : "bg-card text-card-foreground border border-border shadow-md hover:scale-105 hover:bg-accent"

  const distanceHtml =
    distanceKm !== undefined
      ? `<span class="ml-1 text-xs text-primary font-bold ${isSelected ? "text-primary-foreground" : ""}">${formatDistance(distanceKm)}</span>`
      : ""

  const html = `
    <div class="relative flex items-center justify-center transition-transform duration-200 cursor-pointer">
      <div class="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${bgClass}">
        <span class="inline-block size-2 rounded-full bg-primary ${isSelected ? "bg-background" : ""}"></span>
        <span class="truncate max-w-30">${place.name}</span>
        <span class="text-xs opacity-75">${priceIndicator}</span>
        ${distanceHtml}
      </div>
      <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${isSelected ? "bg-primary" : "bg-card border-r border-b border-border"}"></div>
    </div>
  `

  return L.divIcon({
    html,
    className: "custom-place-marker",
    iconSize: [160, 36],
    iconAnchor: [80, 36],
    popupAnchor: [0, -36],
  })
}

/** Marker hiển thị vị trí người dùng — HTML chuỗi vì Leaflet `divIcon` yêu cầu. */
function createUserLocationIcon() {
  const html = `
    <div class="relative flex items-center justify-center">
      <div class="size-6 rounded-full bg-primary/20 ring-4 ring-primary/30 flex items-center justify-center animate-pulse">
        <div class="size-3.5 rounded-full bg-primary border-2 border-background shadow-md"></div>
      </div>
    </div>
  `
  return L.divIcon({
    html,
    className: "user-location-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export function PlacesMap({
  places,
  selectedPlaceId,
  onSelectPlace,
  userCoordinates,
  className = "",
  height = "h-[650px]",
  onViewportChange,
  fitKey,
  isPlacesLoading = false,
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

  // OpenStreetMap Tile tiêu chuẩn hoàn toàn miễn phí, 100% không cần API key
  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  const attribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl border bg-muted shadow-inner",
        height,
        className,
      )}
    >
      <MapContainer
        center={DANANG_CENTER_TUPLE}
        zoom={DANANG_DEFAULT_ZOOM}
        scrollWheelZoom={true}
        className={cn("z-0 h-full w-full", isDark && "map-tiles-dark")}
      >
        <TileLayer attribution={attribution} url={tileUrl} />
        <MapBoundsUpdater
          places={validPlaces}
          selectedPlace={selectedPlace}
          userCoordinates={userCoordinates}
          fitKey={fitKey}
        />
        {onViewportChange ? <ViewportReporter onChange={onViewportChange} /> : null}

        {/* Marker vị trí hiện tại của người dùng */}
        {userCoordinates ? (
          <Marker
            position={[userCoordinates.lat, userCoordinates.lng]}
            icon={createUserLocationIcon()}
          >
            <Popup closeButton={false}>
              <div className="flex items-center gap-1 p-1 text-xs font-semibold text-foreground">
                <NavigationIcon className="size-3 text-primary" />
                Vị trí của bạn
              </div>
            </Popup>
          </Marker>
        ) : null}

        {validPlaces.map((place) => {
          const isSelected = place.id === selectedPlaceId
          const distanceKm =
            userCoordinates && place.lat && place.lng
              ? calculateDistanceKm(userCoordinates.lat, userCoordinates.lng, place.lat, place.lng)
              : undefined

          const icon = createMarkerIcon(place, isSelected, distanceKm)

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
                {/* Ngoại lệ có chủ đích: popup Leaflet tự quản khung/overflow nên dùng `div`, không bọc `Card` (ring + overflow-hidden phá layout popup). Xem docs/CONVENTIONS.md. */}
                <div className="flex max-w-65 min-w-55 flex-col gap-2 p-1">
                  <div className="relative h-28 w-full overflow-hidden rounded-md bg-muted">
                    <CoverImage
                      src={place.imageUrl}
                      placeholder={place.category}
                      height={112}
                      alt={placeImageAlt(place)}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {CATEGORY_META[place.category]?.label}
                      </Badge>
                      {place.district ? (
                        <Badge variant="outline" className="bg-background/80 text-xs backdrop-blur">
                          {place.district}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <h4 className="line-clamp-1 font-heading text-sm leading-tight font-bold text-foreground">
                      {place.name}
                    </h4>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{place.address}</p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="flex items-center gap-1 text-xs font-semibold text-star">
                        <StarIcon className="size-3.5 fill-current" />
                        {formatRating(place.rating)}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({place.reviewCount})
                        </span>
                      </span>

                      <div className="flex items-center gap-2">
                        {distanceKm !== undefined ? (
                          <span className="flex items-center gap-0.5 text-xs font-semibold text-primary">
                            <NavigationIcon className="size-3" />
                            {formatDistance(distanceKm)}
                          </span>
                        ) : null}
                        <span className="text-xs font-medium text-muted-foreground">
                          {priceLevelLabel(place.priceLevel)}
                        </span>
                      </div>
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
      <div className="absolute bottom-3 left-3 z-1000 flex items-center gap-2 rounded-md border bg-background/90 px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur">
        {isPlacesLoading && validPlaces.length === 0 ? (
          <span>Đang tải địa điểm trong vùng xem…</span>
        ) : (
          <span>Đang hiển thị {validPlaces.length} địa điểm trong vùng xem</span>
        )}
        {userCoordinates ? (
          <span className="flex items-center gap-0.5 text-primary">
            <NavigationIcon className="size-3" /> Đã bật vị trí
          </span>
        ) : null}
      </div>
    </div>
  )
}
