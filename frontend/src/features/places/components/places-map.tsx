import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router"
import { MapContainer, Marker, Popup, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import Supercluster from "supercluster"
import type { Feature, Point } from "geojson"
import { ExternalLinkIcon, LayersIcon, NavigationIcon, StarIcon, XIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CoverImage } from "@/components/shared/cover-image"
import { placeImageAlt } from "@/components/shared/place-image-alt"
import { CATEGORY_META, categoryIconSvg } from "../lib/category-meta"
import { ResilientTileLayer } from "./resilient-tile-layer"
import { formatDistance, formatRating } from "@/lib/format"
import { calculateDistanceKm, DANANG_DISTRICT_CENTERS } from "../lib/danang-districts"
import { priceLevelLabel } from "../lib/price-level"
import { cn } from "@/lib/utils"
import { DANANG_CENTER_TUPLE, DANANG_DEFAULT_ZOOM } from "@/lib/constants"
import type { MapBounds } from "../api/get-map-places"
import type { Place, PlaceCategory } from "../types/place"

interface PlacesMapProps {
  readonly places: Place[]
  readonly selectedPlaceId?: string | null
  readonly onSelectPlace?: (place: Place) => void
  readonly onClearSelection?: () => void
  readonly activeCategory?: PlaceCategory | "all"
  readonly onCategorySelect?: (category: PlaceCategory | "all") => void
  readonly userCoordinates?: { lat: number; lng: number } | null
  readonly className?: string

  readonly height?: string

  readonly onViewportChange?: (bounds: MapBounds) => void

  readonly fitKey?: string

  readonly isPlacesLoading?: boolean

  readonly isPlaceholderData?: boolean

  readonly isEmptyViewport?: boolean

  readonly selectedDistrict?: string

  readonly onFitApplied?: () => void

  readonly totalPlaces?: number
}

const LABEL_MIN_ZOOM = 17

const TOP_LABEL_COUNT = 8

const CLUSTER_RADIUS = 60

const CLUSTER_MAX_ZOOM = 16

const LABEL_CHAR_WIDTH = 6.5
const LABEL_BASE_WIDTH = 24

interface ClusterPointProps {
  place: Place
}

interface ClusterProperties {
  cluster: true
  cluster_id: number
  point_count: number
}

type ClusterOrPointFeature = Feature<Point, ClusterProperties> | Feature<Point, ClusterPointProps>

function isClusterProperties(
  props: ClusterProperties | ClusterPointProps,
): props is ClusterProperties {
  return "cluster" in props && props.cluster === true
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function MapBoundsUpdater({
  places,
  selectedPlace,
  userCoordinates,
  fitKey,
  isPlacesLoading,
  isPlaceholderData,
  selectedDistrict,
  onFitApplied,
}: Readonly<{
  places: Place[]
  selectedPlace?: Place
  userCoordinates?: { lat: number; lng: number } | null
  fitKey?: string
  isPlacesLoading?: boolean
  isPlaceholderData?: boolean
  selectedDistrict?: string
  onFitApplied?: () => void
}>) {
  const map = useMap()
  const fittedKeyRef = useRef<string | null>(null)
  const onFitAppliedRef = useRef(onFitApplied)
  useEffect(() => {
    onFitAppliedRef.current = onFitApplied
  })

  useEffect(() => {
    if (selectedPlace?.lat !== undefined && selectedPlace?.lng !== undefined) {
      map.flyTo([selectedPlace.lat, selectedPlace.lng], Math.max(map.getZoom(), 15), {
        duration: 0.8,
      })
      return
    }

    // Đang chờ dữ liệu mới hoặc đang hiển thị placeholder của bộ lọc cũ → không fit.
    if (isPlaceholderData || isPlacesLoading) return

    // Đã căn cho khoá này rồi thì thôi.
    if (fittedKeyRef.current === fitKey) return

    const validPlaces = places.filter((p) => p.lat !== undefined && p.lng !== undefined)
    const points: [number, number][] = validPlaces.map((p) => [p.lat!, p.lng!])
    if (points.length === 0) {
      const center = selectedDistrict ? DANANG_DISTRICT_CENTERS[selectedDistrict] : undefined
      if (center) {
        map.flyTo(center, 13, { duration: 0.6 })
      }
      fittedKeyRef.current = fitKey ?? null
      onFitAppliedRef.current?.()
      return
    }

    // Chỉ gộp vị trí người dùng vào fitBounds khi không lọc theo quận cụ thể
    // và toạ độ người dùng thực sự nằm trong khu vực Đà Nẵng (tránh kéo văng bản đồ).
    if (
      !selectedDistrict &&
      userCoordinates &&
      userCoordinates.lat >= 15.95 &&
      userCoordinates.lat <= 16.2 &&
      userCoordinates.lng >= 108.05 &&
      userCoordinates.lng <= 108.35
    ) {
      points.push([userCoordinates.lat, userCoordinates.lng])
    }

    const firstPoint = points[0]
    if (points.length === 1 && firstPoint) {
      map.flyTo(firstPoint, 16, { duration: 0.6 })
    } else {
      const bounds = L.latLngBounds(points)
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
    }
    fittedKeyRef.current = fitKey ?? null
    onFitAppliedRef.current?.()
  }, [
    fitKey,
    selectedPlace,
    userCoordinates,
    places,
    isPlacesLoading,
    isPlaceholderData,
    selectedDistrict,
    map,
  ])

  return null
}

function ViewportReporter({ onChange }: Readonly<{ onChange: (bounds: MapBounds) => void }>) {
  // Giữ callback mới nhất trong ref để `emit` ổn định (không re-run effect khi
  // parent render lại), đồng thời không cần eslint-disable exhaustive-deps.
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  const map = useMap()
  const emit = useCallback(() => {
    const b = map.getBounds()
    onChangeRef.current({
      minLat: b.getSouth(),
      minLng: b.getWest(),
      maxLat: b.getNorth(),
      maxLng: b.getEast(),
    })
  }, [map])

  useMapEvents({ moveend: emit, zoomend: emit })

  // Báo khung nhìn ban đầu để lần mở đầu tiên cũng nạp theo vùng thật.
  useEffect(() => {
    emit()
  }, [emit])

  return null
}

function createPlacePinIcon(
  place: Place,
  {
    isSelected,
    showLabel,
    distanceKm,
  }: { isSelected: boolean; showLabel: boolean; distanceKm?: number },
) {
  const meta = CATEGORY_META[place.category]
  const priceIndicator = priceLevelLabel(place.priceLevel)

  const distanceHtml =
    distanceKm !== undefined
      ? `<span class="text-xs font-bold text-primary">${formatDistance(distanceKm)}</span>`
      : ""

  const labelHtml = showLabel
    ? `<span class="flex max-w-36 items-center gap-1 truncate rounded-full border border-border bg-card/95 px-2 py-0.5 text-xs font-semibold text-card-foreground shadow-sm backdrop-blur">
         <span class="truncate">${escapeHtml(place.name)}</span>
         <span class="shrink-0 font-normal text-muted-foreground">${priceIndicator}</span>
         ${distanceHtml}
       </span>`
    : ""

  const html = `
    <div class="group flex cursor-pointer items-center gap-1.5 focus-visible:outline-none">
      <span class="flex size-7 shrink-0 items-center justify-center rounded-full text-primary-foreground shadow-md ring-2 ring-background transition-transform duration-200 ${
        isSelected ? "scale-110 ring-4 ring-primary/40" : "group-hover:scale-110"
      }" style="background-color: ${meta.color}">
        ${categoryIconSvg(place.category, 14)}
      </span>
      ${labelHtml}
    </div>
  `

  // Bề rộng icon co theo nhãn để Leaflet tính đúng vùng bấm; mốc neo luôn ở
  // tâm chấm tròn (14,14) — nhãn nằm bên phải nên không lệch vị trí địa lý.
  const width = showLabel ? 200 : 28

  return L.divIcon({
    html,
    className: "custom-place-marker",
    iconSize: [width, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  })
}

function getClusterSize(count: number): number {
  if (count >= 50) return 52
  if (count >= 10) return 44
  return 36
}

/** Cụm pin: vòng tròn hiện số quán bên trong, to dần theo số lượng. */
function createClusterIcon(count: number) {
  const size = getClusterSize(count)
  const html = `
    <div class="flex items-center justify-center rounded-full bg-primary font-heading font-bold text-primary-foreground shadow-lg ring-4 ring-primary/25 transition-transform duration-200 hover:scale-105" style="width: ${size}px; height: ${size}px; font-size: ${size >= 44 ? 14 : 12}px">
      ${count}
    </div>
  `
  return L.divIcon({
    html,
    className: "place-cluster-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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

/**
 * Lớp pin có gom cụm (supercluster — thuật toán chuẩn của Mapbox, thuần JS nên
 * chạy tốt với React 19/react-leaflet v5, không cần plugin React).
 *
 * Ở zoom thấp, các quán sát nhau được gom thành một cụm hiện số lượng; bấm cụm
 * để phóng tới mức zoom mà cụm tách ra. Từ `LABEL_MIN_ZOOM` trở lên mới hiện
 * tên quán, nhờ vậy 286 pin không còn phủ kín bản đồ bằng chữ.
 */
function ClusteredPlaceMarkers({
  places,
  selectedPlaceId,
  onSelectPlace,
  userCoordinates,
  topPlaceIds,
}: Readonly<{
  places: Place[]
  selectedPlaceId?: string | null
  onSelectPlace?: (place: Place) => void
  userCoordinates?: { lat: number; lng: number } | null
  topPlaceIds: Set<string>
}>) {
  const map = useMap()
  const markerRefs = useRef<Record<string, L.Marker | null>>({})
  const [viewport, setViewport] = useState(() => ({
    bounds: map.getBounds(),
    zoom: map.getZoom(),
  }))

  // Chỉ tính lại cụm khi pan/zoom xong — không tính trong lúc đang kéo.
  const syncViewport = useCallback(() => {
    setViewport({ bounds: map.getBounds(), zoom: map.getZoom() })
  }, [map])
  useMapEvents({ moveend: syncViewport, zoomend: syncViewport })

  // Chỉ mục cụm dựng lại khi tập pin đổi (đổi vùng xem/bộ lọc).
  const index = useMemo(() => {
    const supercluster = new Supercluster<ClusterPointProps>({
      radius: CLUSTER_RADIUS,
      maxZoom: CLUSTER_MAX_ZOOM,
      minPoints: 2,
    })
    supercluster.load(
      places.map((place) => ({
        type: "Feature" as const,
        properties: { place },
        geometry: { type: "Point" as const, coordinates: [place.lng!, place.lat!] },
      })),
    )
    return supercluster
  }, [places])

  const clusters = useMemo<ClusterOrPointFeature[]>(() => {
    const b = viewport.bounds
    return index.getClusters(
      [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
      Math.floor(viewport.zoom),
    )
  }, [index, viewport])

  // Mở popup khi selectedPlaceId thay đổi (nếu pin đang tách rời).
  useEffect(() => {
    if (!selectedPlaceId) return
    const marker = markerRefs.current[selectedPlaceId]
    if (marker && !marker.isPopupOpen()) marker.openPopup()
  }, [selectedPlaceId, clusters])

  const renderedLeaves = useMemo(() => {
    const groups = new Map<string, { place: Place; lat: number; lng: number }[]>()
    for (const feature of clusters) {
      if (isClusterProperties(feature.properties)) continue
      const [lng, lat] = feature.geometry.coordinates
      if (lat === undefined || lng === undefined) continue
      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`
      const list = groups.get(key) ?? []
      list.push({ place: feature.properties.place, lat, lng })
      groups.set(key, list)
    }

    const out: { place: Place; displayLat: number; displayLng: number }[] = []
    const canSpiderfy =
      typeof map.latLngToLayerPoint === "function" && typeof map.layerPointToLatLng === "function"
    for (const bucket of groups.values()) {
      if (bucket.length === 1 || !canSpiderfy) {
        for (const item of bucket) {
          out.push({ place: item.place, displayLat: item.lat, displayLng: item.lng })
        }
        continue
      }
      const anchor = bucket[0]
      if (!anchor) continue
      const centerPx = map.latLngToLayerPoint([anchor.lat, anchor.lng])
      const radiusPx = 20 + Math.min(bucket.length, 8) * 3
      bucket.forEach((item, idx) => {
        const angle = (2 * Math.PI * idx) / bucket.length - Math.PI / 2
        const shifted = L.point(
          centerPx.x + Math.cos(angle) * radiusPx,
          centerPx.y + Math.sin(angle) * radiusPx,
        )
        const latLng = map.layerPointToLatLng(shifted)
        out.push({ place: item.place, displayLat: latLng.lat, displayLng: latLng.lng })
      })
    }
    return out
  }, [clusters, map])

  /**
   * Tập quán được hiện tên — declutter theo thứ tự ưu tiên (đang chọn → điểm
   * cao → nhiều đánh giá). Chỉ xét các cụm và pin lá ĐANG HIỂN THỊ (không để pin
   * ẩn trong cụm chặn nhãn của pin đang tách rời).
   */
  const labeledIds = useMemo(() => {
    const candidates = renderedLeaves
      .filter(
        ({ place }) =>
          place.id === selectedPlaceId ||
          viewport.zoom >= LABEL_MIN_ZOOM ||
          topPlaceIds.has(place.id),
      )
      .sort((a, b) => {
        const selectedDelta =
          Number(b.place.id === selectedPlaceId) - Number(a.place.id === selectedPlaceId)
        return (
          selectedDelta ||
          b.place.rating - a.place.rating ||
          b.place.reviewCount - a.place.reviewCount
        )
      })

    const taken: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
    const shown = new Set<string>()

    for (const feature of clusters) {
      if (!isClusterProperties(feature.properties)) continue
      const [lng, lat] = feature.geometry.coordinates
      if (lat === undefined || lng === undefined) continue
      const point = map.latLngToContainerPoint([lat, lng])
      const half = getClusterSize(feature.properties.point_count) / 2
      taken.push({ x1: point.x - half, y1: point.y - half, x2: point.x + half, y2: point.y + half })
    }

    for (const { displayLat, displayLng } of renderedLeaves) {
      const point = map.latLngToContainerPoint([displayLat, displayLng])
      taken.push({ x1: point.x - 14, y1: point.y - 14, x2: point.x + 14, y2: point.y + 14 })
    }

    for (const { place, displayLat, displayLng } of candidates) {
      const point = map.latLngToContainerPoint([displayLat, displayLng])
      const width = LABEL_BASE_WIDTH + place.name.length * LABEL_CHAR_WIDTH
      const rect = {
        x1: point.x + 16,
        y1: point.y - 14,
        x2: point.x + 16 + width,
        y2: point.y + 8,
      }
      const overlaps = taken.some(
        (t) => rect.x1 < t.x2 && t.x1 < rect.x2 && rect.y1 < t.y2 && t.y1 < rect.y2,
      )
      if (overlaps) continue

      shown.add(place.id)
      taken.push(rect)
    }

    return shown
  }, [clusters, renderedLeaves, selectedPlaceId, viewport, topPlaceIds, map])

  return (
    <>
      {clusters.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates
        const props = feature.properties
        if (!isClusterProperties(props)) return null

        const { cluster_id: clusterId, point_count: pointCount } = props
        const expandCluster = () => {
          // Phóng tới đúng mức zoom mà cụm này tách ra (chuẩn supercluster).
          const expansionZoom = Math.min(index.getClusterExpansionZoom(clusterId), 18)
          map.flyTo([lat, lng], expansionZoom, { duration: 0.5 })
        }

        return (
          <Marker
            key={`cluster-${clusterId}`}
            position={[lat, lng]}
            keyboard={true}
            icon={createClusterIcon(pointCount)}
            title={`${pointCount} địa điểm, bấm để phóng to`}
            alt={`${pointCount} địa điểm, bấm để phóng to`}
            eventHandlers={{
              click: expandCluster,
              keydown: (e) => {
                const key = e.originalEvent.key
                if (key === "Enter" || key === " " || key === "Spacebar") {
                  e.originalEvent.preventDefault()
                  expandCluster()
                }
              },
            }}
          />
        )
      })}

      {renderedLeaves.map(({ place, displayLat, displayLng }) => {
        const isSelected = place.id === selectedPlaceId
        const distanceKm =
          userCoordinates && place.lat !== undefined && place.lng !== undefined
            ? calculateDistanceKm(userCoordinates.lat, userCoordinates.lng, place.lat, place.lng)
            : undefined
        const showLabel = labeledIds.has(place.id)

        const handleSelectPlace = () => {
          onSelectPlace?.(place)
          const marker = markerRefs.current[place.id]
          if (marker && typeof marker.isPopupOpen === "function" && !marker.isPopupOpen()) {
            marker.openPopup()
          }
        }

        return (
          <Marker
            key={place.id}
            position={[displayLat, displayLng]}
            keyboard={true}
            icon={createPlacePinIcon(place, { isSelected, showLabel, distanceKm })}
            title={place.name}
            alt={place.name}
            ref={(ref) => {
              markerRefs.current[place.id] = ref
            }}
            eventHandlers={{
              click: handleSelectPlace,
              keydown: (e) => {
                const key = e.originalEvent.key
                if (key === "Enter" || key === " " || key === "Spacebar") {
                  e.originalEvent.preventDefault()
                  handleSelectPlace()
                }
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
                    name={place.name}
                    height={112}
                    alt={placeImageAlt(place)}
                    sizes="260px"
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
                    nativeButton={false}
                    className="h-9 w-full text-xs"
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
    </>
  )
}

function MapCategoryLegend({
  activeCategory = "all",
  onCategorySelect,
}: Readonly<{
  activeCategory?: PlaceCategory | "all"
  onCategorySelect?: (category: PlaceCategory | "all") => void
}>) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="absolute right-3 bottom-14 z-1000 flex flex-col items-end gap-1.5 sm:top-auto sm:bottom-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-9 gap-1.5 px-2.5 text-xs shadow-md backdrop-blur sm:hidden"
        aria-expanded={mobileOpen}
        aria-label={mobileOpen ? "Đóng chú giải loại hình" : "Mở chú giải loại hình"}
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? (
          <XIcon className="size-3.5" aria-hidden="true" />
        ) : (
          <LayersIcon className="size-3.5" aria-hidden="true" />
        )}
        Chú giải
      </Button>

      <div
        className={cn(
          "flex-col gap-1 rounded-surface border border-border/80 bg-background/92 p-2 text-xs shadow-(--shadow-raised) backdrop-blur-md sm:flex",
          mobileOpen ? "flex" : "hidden",
        )}
      >
        {Object.entries(CATEGORY_META).map(([category, meta]) => {
          const cat = category as PlaceCategory
          const isSelected = activeCategory === cat
          const isDimmed = activeCategory !== "all" && !isSelected

          if (onCategorySelect) {
            return (
              <button
                key={category}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onCategorySelect(isSelected ? "all" : cat)}
                className={cn(
                  "flex items-center gap-2 rounded-control px-2 py-1 text-left transition-colors hover:bg-muted",
                  isSelected && "bg-primary/12 font-semibold text-primary",
                  isDimmed && "opacity-55",
                )}
              >
                <span
                  className="inline-block size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                {meta.label}
              </button>
            )
          }

          return (
            <span key={category} className="flex items-center gap-1.5 px-1 py-0.5">
              <span
                className="inline-block size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              {meta.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function PlacesMap({
  places,
  selectedPlaceId,
  onSelectPlace,
  onClearSelection,
  activeCategory,
  onCategorySelect,
  userCoordinates,
  className = "",
  height = "h-[650px]",
  onViewportChange,
  fitKey,
  isPlacesLoading = false,
  isPlaceholderData = false,
  isEmptyViewport = false,
  selectedDistrict,
  onFitApplied,
  totalPlaces,
}: PlacesMapProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const validPlaces = useMemo(
    () => places.filter((p) => p.lat !== undefined && p.lng !== undefined),
    [places],
  )

  const selectedPlace = useMemo(
    () => validPlaces.find((p) => p.id === selectedPlaceId),
    [validPlaces, selectedPlaceId],
  )

  const topPlaceIds = useMemo(() => {
    const ranked = validPlaces.toSorted(
      (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
    )
    return new Set(ranked.slice(0, TOP_LABEL_COUNT).map((p) => p.id))
  }, [validPlaces])

  const selectedDistanceKm =
    selectedPlace &&
    userCoordinates &&
    selectedPlace.lat !== undefined &&
    selectedPlace.lng !== undefined
      ? calculateDistanceKm(
          userCoordinates.lat,
          userCoordinates.lng,
          selectedPlace.lat,
          selectedPlace.lng,
        )
      : undefined

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-surface border bg-muted shadow-inner",
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
        <ResilientTileLayer />
        <MapBoundsUpdater
          places={validPlaces}
          selectedPlace={selectedPlace}
          userCoordinates={userCoordinates}
          fitKey={fitKey}
          isPlacesLoading={isPlacesLoading}
          isPlaceholderData={isPlaceholderData}
          selectedDistrict={selectedDistrict}
          onFitApplied={onFitApplied}
        />
        {onViewportChange ? <ViewportReporter onChange={onViewportChange} /> : null}

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

        <ClusteredPlaceMarkers
          places={validPlaces}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={onSelectPlace}
          userCoordinates={userCoordinates}
          topPlaceIds={topPlaceIds}
        />
      </MapContainer>

      <MapCategoryLegend activeCategory={activeCategory} onCategorySelect={onCategorySelect} />

      {selectedPlace ? (
        <div className="absolute right-3 bottom-14 left-3 z-1000 mx-auto max-w-sm rounded-surface border border-border/80 bg-background/95 p-3 shadow-(--shadow-floating) backdrop-blur-md sm:right-auto sm:bottom-14 sm:left-3 sm:w-88">
          <div className="flex items-start gap-3">
            <CoverImage
              src={selectedPlace.imageUrl}
              placeholder={selectedPlace.category}
              name={selectedPlace.name}
              alt={placeImageAlt(selectedPlace)}
              sizes="96px"
              className="size-20 shrink-0 rounded-control"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-1">
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {CATEGORY_META[selectedPlace.category]?.label}
                </Badge>
                {onClearSelection ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Đóng thẻ xem nhanh"
                    onClick={onClearSelection}
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                ) : null}
              </div>
              <h3 className="mt-1 truncate font-display text-sm font-bold text-foreground">
                {selectedPlace.name}
              </h3>
              <p className="truncate text-xs text-muted-foreground">{selectedPlace.address}</p>
              <div className="mt-1.5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-semibold text-star tabular-nums">
                  <StarIcon className="size-3.5 fill-current" aria-hidden="true" />
                  {formatRating(selectedPlace.rating)}
                </span>
                {selectedDistanceKm !== undefined ? (
                  <span className="font-semibold text-primary">
                    {formatDistance(selectedDistanceKm)}
                  </span>
                ) : null}
                <Button size="xs" render={<Link to={`/discover/${selectedPlace.id}`} />}>
                  Xem quán
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isEmptyViewport && validPlaces.length === 0 && !isPlacesLoading ? (
        <div className="absolute right-3 bottom-14 left-3 z-1000 w-fit rounded-control border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-md backdrop-blur">
          Không có địa điểm nào trong vùng này. Thu nhỏ hoặc kéo bản đồ để xem khu vực khác.
        </div>
      ) : null}

      <div className="absolute bottom-3 left-3 z-1000 flex items-center gap-2 rounded-control border border-border/80 bg-background/92 px-3 py-1.5 text-xs font-medium shadow-(--shadow-soft) backdrop-blur-md">
        <PlacesSummaryText
          isLoading={isPlacesLoading}
          validCount={validPlaces.length}
          totalCount={totalPlaces}
        />
        {userCoordinates ? (
          <span className="flex items-center gap-0.5 text-primary">
            <NavigationIcon className="size-3" /> Đã bật vị trí
          </span>
        ) : null}
      </div>
    </div>
  )
}

function PlacesSummaryText({
  isLoading,
  validCount,
  totalCount,
}: Readonly<{ isLoading?: boolean; validCount: number; totalCount?: number }>) {
  if (isLoading && validCount === 0) {
    return <span>Đang tải địa điểm trong vùng xem…</span>
  }
  if (totalCount !== undefined && totalCount > validCount) {
    return (
      <span>
        Đang hiển thị {validCount}/{totalCount} địa điểm trong vùng xem, zoom sát hơn để xem hết
      </span>
    )
  }
  return <span>Đang hiển thị {validCount} địa điểm trong vùng xem</span>
}
