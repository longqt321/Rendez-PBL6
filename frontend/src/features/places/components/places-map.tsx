import { useMemo } from "react"
import "leaflet/dist/leaflet.css"
import { NavigationIcon, StarIcon, XIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { MapContainer, Marker, Popup } from "react-leaflet"
import { Link } from "react-router"
import { CoverImage } from "@/components/shared/cover-image"
import { placeImageAlt } from "@/components/shared/place-image-alt"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useIsDesktop } from "@/hooks/use-breakpoint"
import { DANANG_CENTER_TUPLE, DANANG_DEFAULT_ZOOM } from "@/lib/constants"
import { formatDistance } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { MapBounds } from "../api/get-map-places"
import { CATEGORY_META } from "../lib/category-meta"
import { calculateDistanceKm } from "../lib/danang-districts"
import { formatPlaceTrustLabel } from "../lib/review-tier-meta"
import type { Place, PlaceCategory } from "../types/place"
import { ClusteredPlaceMarkers } from "./map/clustered-place-markers"
import {
  MapBoundsUpdater,
  MapCategoryLegend,
  PlacesSummaryText,
  ViewportReporter,
} from "./map/map-helpers"
import { TOP_LABEL_COUNT, createUserLocationIcon } from "./map/map-icons"
import { ResilientTileLayer } from "./resilient-tile-layer"

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

  readonly isNearbyActive?: boolean

  readonly isPlacesLoading?: boolean

  readonly isPlaceholderData?: boolean

  readonly isEmptyViewport?: boolean

  readonly selectedDistrict?: string

  readonly onFitApplied?: () => void

  readonly totalPlaces?: number
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
  isNearbyActive = false,
  isPlacesLoading = false,
  isPlaceholderData = false,
  isEmptyViewport = false,
  selectedDistrict,
  onFitApplied,
  totalPlaces,
}: PlacesMapProps) {
  const { resolvedTheme } = useTheme()
  const isDesktop = useIsDesktop()
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
      (a, b) => b.positiveRatio - a.positiveRatio || b.reviewCount - a.reviewCount,
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
        "relative isolate w-full overflow-hidden rounded-surface border bg-muted shadow-inner",
        height,
        className,
      )}
    >
      <MapContainer
        center={DANANG_CENTER_TUPLE}
        zoom={DANANG_DEFAULT_ZOOM}
        scrollWheelZoom={true}
        zoomControl={isDesktop}
        className={cn("z-0 h-full w-full", isDark && "map-tiles-dark")}
      >
        <ResilientTileLayer />
        <MapBoundsUpdater
          places={validPlaces}
          userCoordinates={userCoordinates}
          fitKey={fitKey}
          isNearbyActive={isNearbyActive}
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
            zIndexOffset={1000}
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
                  {formatPlaceTrustLabel(selectedPlace.mustTryCount, selectedPlace.reviewCount)}
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

      <div className="absolute bottom-3 left-3 z-1000 flex items-center gap-2 rounded-control border border-border/80 bg-background/92 px-2.5 py-1 text-xs font-medium shadow-(--shadow-soft) backdrop-blur-md md:px-3 md:py-1.5">
        <PlacesSummaryText
          isLoading={isPlacesLoading}
          validCount={validPlaces.length}
          totalCount={totalPlaces}
          compact={!isDesktop}
        />
        {userCoordinates ? (
          <span className="flex items-center gap-0.5 text-primary">
            <NavigationIcon className="size-3" /> {isDesktop ? "Đã bật vị trí" : "GPS"}
          </span>
        ) : null}
      </div>
    </div>
  )
}
