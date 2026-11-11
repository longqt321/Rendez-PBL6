import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router"
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import Supercluster from "supercluster"
import type { Feature, Point } from "geojson"
import { ExternalLinkIcon, NavigationIcon, StarIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CoverImage } from "@/components/shared/cover-image"
import { placeImageAlt } from "@/components/shared/place-image-alt"
import { CATEGORY_META, categoryIconSvg } from "../lib/category-meta"
import { OSM_TILE_LAYER_PROPS } from "../lib/map-tiles"
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
  /**
   * Tổng số địa điểm khớp trong khung (server trả). Lớn hơn `places.length` khi
   * vượt chặn trên — nhãn đếm phải nói rõ "x/y" thay vì giấu phần bị cắt.
   */
  totalPlaces?: number
}

/**
 * Từ mức zoom này trở lên mới cân nhắc hiện tên quán cạnh pin — ở zoom thấp
 * chữ sẽ chồng lên nhau (bài toán 286 pin phủ kín Đà Nẵng). Dưới ngưỡng này
 * chỉ quán nổi bật (`TOP_LABEL_COUNT`) và quán đang chọn được hiện tên.
 */
const LABEL_MIN_ZOOM = 17

/** Số quán được ưu tiên hiện tên ở zoom thấp: điểm đánh giá cao nhất trong khung. */
const TOP_LABEL_COUNT = 8

/** Bán kính gom cụm (px) — mốc chuẩn của supercluster, đủ tách cụm khi zoom. */
const CLUSTER_RADIUS = 60

/** Zoom tối đa còn gom cụm; từ mức này trở lên mọi pin tách rời nhau. */
const CLUSTER_MAX_ZOOM = 16

/** Ước lượng bề rộng nhãn để tính chồng lấn mà không cần đo DOM. */
const LABEL_CHAR_WIDTH = 6.5
const LABEL_BASE_WIDTH = 24

/** Thuộc tính gắn vào từng điểm trước khi đưa vào supercluster. */
interface ClusterPointProps {
  place: Place
}

/** Thuộc tính của một cụm do supercluster sinh ra. */
interface ClusterProperties {
  cluster: true
  cluster_id: number
  point_count: number
}

/**
 * Kiểu feature sau khi `getClusters` trả về. Typings của supercluster để nửa
 * "cụm" thành `any` (AnyProps) nên khai báo lại tường minh ở đây.
 */
type ClusterOrPointFeature = Feature<Point, ClusterProperties> | Feature<Point, ClusterPointProps>

/** Type guard: feature là cụm hay pin lẻ (typings supercluster để nửa cụm là `any`). */
function isClusterProperties(
  props: ClusterProperties | ClusterPointProps,
): props is ClusterProperties {
  return "cluster" in props && props.cluster === true
}

/** Escape chuỗi trước khi nhét vào HTML của `divIcon` (tên quán do người dùng nhập). */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

/**
 * Căn tầm nhìn — mỗi `fitKey` chỉ căn MỘT lần, và chỉ căn khi đã có điểm để căn
 * (guard `fittedKeyRef`). Nhờ guard này, phụ thuộc `places` là an toàn: dữ liệu
 * về sau khi bộ lọc đổi sẽ căn lại đúng một lần, không tạo vòng lặp
 * "căn → khung nhìn đổi → nạp vùng mới → căn lại…".
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
}) {
  const map = useMap()
  const fittedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (selectedPlace?.lat && selectedPlace?.lng) {
      map.flyTo([selectedPlace.lat, selectedPlace.lng], Math.max(map.getZoom(), 15), {
        duration: 0.8,
      })
      return
    }

    // Đã căn cho khoá này rồi (hoặc đang chờ dữ liệu về) thì thôi.
    if (fittedKeyRef.current === fitKey) return

    const validPlaces = places.filter((p) => p.lat !== undefined && p.lng !== undefined)
    const points: [number, number][] = validPlaces.map((p) => [p.lat!, p.lng!])
    if (userCoordinates) {
      points.push([userCoordinates.lat, userCoordinates.lng])
    }
    if (points.length < 2) return

    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
    fittedKeyRef.current = fitKey ?? null
  }, [fitKey, selectedPlace, userCoordinates, places, map])

  return null
}

/**
 * Báo khung nhìn hiện tại mỗi khi người dùng pan/zoom xong (lẫn lúc mở bản đồ).
 * Việc làm chậm 300ms nằm ở `map-page` (`useDebounce` của `@uidotdev/usehooks`)
 * — component này chỉ đọc sự kiện của Leaflet và báo giá trị, không tự điều phối.
 */
function ViewportReporter({ onChange }: { onChange: (bounds: MapBounds) => void }) {
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

/**
 * Pin của một quán: chấm tròn màu theo category + icon loại hình, nhìn là biết
 * quán gì. Tên quán chỉ hiện ở zoom cao / khi chọn / quán nổi bật (`showLabel`).
 *
 * Leaflet `divIcon` chỉ nhận chuỗi HTML — không render JSX ở đây được.
 */
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
    <div class="group flex cursor-pointer items-center gap-1.5" role="img" aria-label="${escapeHtml(place.name)}">
      <span class="flex size-7 shrink-0 items-center justify-center rounded-full text-white shadow-md ring-2 ring-background transition-transform duration-200 ${
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

/** Cụm pin: vòng tròn hiện số quán bên trong, to dần theo số lượng. */
function createClusterIcon(count: number) {
  const size = count >= 50 ? 52 : count >= 10 ? 44 : 36
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
}: {
  places: Place[]
  selectedPlaceId?: string | null
  onSelectPlace?: (place: Place) => void
  userCoordinates?: { lat: number; lng: number } | null
  topPlaceIds: Set<string>
}) {
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

  /**
   * Tập quán được hiện tên — declutter theo thứ tự ưu tiên (đang chọn → điểm
   * cao → nhiều đánh giá). Ước lượng khung nhãn bằng toạ độ pixel của Leaflet
   * rồi bỏ nhãn nào chồng lên nhãn đã nhận: ở z17 vùng Hải Châu vẫn có ~48 pin
   * nên nếu hiện hết thì 61 cặp nhãn đè nhau (đo thực tế).
   */
  const labeledIds = useMemo(() => {
    const candidates = places
      .filter(
        (p) => p.id === selectedPlaceId || viewport.zoom >= LABEL_MIN_ZOOM || topPlaceIds.has(p.id),
      )
      .sort((a, b) => {
        const selectedDelta = Number(b.id === selectedPlaceId) - Number(a.id === selectedPlaceId)
        return selectedDelta || b.rating - a.rating || b.reviewCount - a.reviewCount
      })

    const taken: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
    const shown = new Set<string>()

    // Chấm pin của MỌI quán đều là vùng không được che — nhãn không đè lên pin
    // khác (kể cả pin không có nhãn), tránh cảnh chữ phủ kín chấm màu.
    for (const place of places) {
      const point = map.latLngToContainerPoint([place.lat!, place.lng!])
      taken.push({ x1: point.x - 14, y1: point.y - 14, x2: point.x + 14, y2: point.y + 14 })
    }

    for (const place of candidates) {
      const point = map.latLngToContainerPoint([place.lat!, place.lng!])
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
  }, [places, selectedPlaceId, viewport, topPlaceIds, map])

  return (
    <>
      {clusters.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates
        // Narrow trên chính `properties` (union) — narrow qua đường dẫn lồng
        // `feature.properties` không được TS hỗ trợ.
        const props = feature.properties

        if (isClusterProperties(props)) {
          const { cluster_id: clusterId, point_count: pointCount } = props
          return (
            <Marker
              key={`cluster-${clusterId}`}
              position={[lat, lng]}
              icon={createClusterIcon(pointCount)}
              title={`${pointCount} địa điểm — bấm để phóng to`}
              eventHandlers={{
                click: () => {
                  // Phóng tới đúng mức zoom mà cụm này tách ra (chuẩn supercluster).
                  const expansionZoom = Math.min(index.getClusterExpansionZoom(clusterId), 18)
                  map.flyTo([lat, lng], expansionZoom, { duration: 0.5 })
                },
              }}
            />
          )
        }

        const place = props.place
        const isSelected = place.id === selectedPlaceId
        const distanceKm =
          userCoordinates && place.lat && place.lng
            ? calculateDistanceKm(userCoordinates.lat, userCoordinates.lng, place.lat, place.lng)
            : undefined
        const showLabel = labeledIds.has(place.id)

        return (
          <Marker
            key={place.id}
            position={[place.lat!, place.lng!]}
            icon={createPlacePinIcon(place, { isSelected, showLabel, distanceKm })}
            title={place.name}
            alt={place.name}
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
    </>
  )
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

  // Top quán nổi bật trong khung (điểm cao, nhiều đánh giá) — được hiện tên
  // ngay cả khi zoom thấp để bản đồ có "điểm nhấn" thay vì chỉ toàn chấm màu.
  const topPlaceIds = useMemo(() => {
    const ranked = [...validPlaces].sort(
      (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
    )
    return new Set(ranked.slice(0, TOP_LABEL_COUNT).map((p) => p.id))
  }, [validPlaces])

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
        <TileLayer {...OSM_TILE_LAYER_PROPS} />
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

        <ClusteredPlaceMarkers
          places={validPlaces}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={onSelectPlace}
          userCoordinates={userCoordinates}
          topPlaceIds={topPlaceIds}
        />
      </MapContainer>

      {/* Chú giải màu pin theo loại hình — pin không còn chữ nên cần bảng màu */}
      <div className="absolute top-3 right-3 z-1000 hidden flex-col gap-1 rounded-md border bg-background/90 px-2.5 py-2 text-xs shadow-md backdrop-blur sm:flex">
        {Object.entries(CATEGORY_META).map(([category, meta]) => (
          <span key={category} className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: meta.color }}
            />
            {meta.label}
          </span>
        ))}
      </div>

      {/* Tóm tắt số lượng địa điểm trên bản đồ */}
      <div className="absolute bottom-3 left-3 z-1000 flex items-center gap-2 rounded-md border bg-background/90 px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur">
        {isPlacesLoading && validPlaces.length === 0 ? (
          <span>Đang tải địa điểm trong vùng xem…</span>
        ) : totalPlaces !== undefined && totalPlaces > validPlaces.length ? (
          <span>
            Đang hiển thị {validPlaces.length}/{totalPlaces} địa điểm trong vùng xem — zoom sát hơn
            để xem hết
          </span>
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
