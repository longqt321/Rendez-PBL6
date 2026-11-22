import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Feature, Point } from "geojson"
import L from "leaflet"
import { ExternalLinkIcon, NavigationIcon, StarIcon } from "lucide-react"
import { Marker, Popup, useMap, useMapEvents } from "react-leaflet"
import { Link } from "react-router"
import Supercluster from "supercluster"
import { CoverImage } from "@/components/shared/cover-image"
import { placeImageAlt } from "@/components/shared/place-image-alt"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDistance } from "@/lib/format"
import { CATEGORY_META } from "../../lib/category-meta"
import { calculateDistanceKm } from "../../lib/danang-districts"
import { priceLevelLabel } from "../../lib/price-level"
import { formatPlaceTrustLabel } from "../../lib/review-tier-meta"
import type { Place } from "../../types/place"
import {
  CLUSTER_MAX_ZOOM,
  CLUSTER_RADIUS,
  LABEL_BASE_WIDTH,
  LABEL_CHAR_WIDTH,
  LABEL_MIN_ZOOM,
  createClusterIcon,
  createPlacePinIcon,
  getClusterSize,
} from "./map-icons"

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

export function ClusteredPlaceMarkers({
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
          b.place.positiveRatio - a.place.positiveRatio ||
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
            <Popup className="place-popup" closeButton={false} autoPan={false}>
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
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  <Badge variant="secondary" className="text-[11px]">
                    {CATEGORY_META[place.category]?.label}
                  </Badge>
                  {place.district ? (
                    <Badge variant="outline" className="text-[11px]">
                      {place.district}
                    </Badge>
                  ) : null}
                </div>

                <div className="flex flex-col gap-1">
                  <h4 className="line-clamp-1 font-heading text-sm leading-tight font-bold text-foreground">
                    {place.name}
                  </h4>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{place.address}</p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="flex items-center gap-1 text-xs font-semibold text-star">
                      <StarIcon className="size-3.5 fill-current" />
                      {formatPlaceTrustLabel(place.mustTryCount, place.reviewCount)}
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
                    className="h-9 w-full text-xs !text-primary-foreground"
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
