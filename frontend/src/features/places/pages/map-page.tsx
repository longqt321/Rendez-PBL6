import { useState } from "react"
import { useDebounce } from "@uidotdev/usehooks"
import { SearchXIcon } from "lucide-react"
import { Link } from "react-router"
import { ErrorState } from "@/components/shared/error-state"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import type { Room } from "@/features/rooms/types/room"
import type { MapBounds } from "../api/get-map-places"
import { DiscoverToolbar } from "../components/discover-toolbar"
import { PlacesMap } from "../components/places-map"
import { useDiscoverView } from "../hooks/use-discover-view"
import { useMapPlaces } from "../hooks/use-map-places"
import type { Place } from "../types/place"

interface MapContentProps {
  readonly view: ReturnType<typeof useDiscoverView>
  readonly mapQuery: ReturnType<typeof useMapPlaces>
  readonly mapPlaces: Place[]
  readonly selectedPlaceId: string | null
  readonly onSelectPlace: (place: Place) => void
  readonly onClearSelection: () => void
  readonly setRawBounds: (bounds: MapBounds | null) => void
  readonly fitKey: string
  readonly needsRefit: boolean
  readonly isEmptyViewport: boolean
  readonly selectedDistrict?: string
  readonly onFitApplied: () => void
  readonly room?: Room
}

function MapContent({
  view,
  mapQuery,
  mapPlaces,
  selectedPlaceId,
  onSelectPlace,
  onClearSelection,
  setRawBounds,
  fitKey,
  needsRefit,
  isEmptyViewport,
  selectedDistrict,
  onFitApplied,
  room,
}: MapContentProps) {
  if (mapQuery.isError) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <ErrorState
          title="Không tải được địa điểm trong vùng xem"
          onRetry={() => {
            mapQuery.refetch().catch(() => {})
          }}
        />
      </div>
    )
  }

  const hasConfirmedNoFilterMatches =
    needsRefit &&
    !mapQuery.isPending &&
    !mapQuery.isFetching &&
    !mapQuery.isPlaceholderData &&
    mapPlaces.length === 0

  if (hasConfirmedNoFilterMatches) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <Empty className="max-w-md border border-dashed border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon />
            </EmptyMedia>
            <EmptyTitle>Không có địa điểm nào trên bản đồ</EmptyTitle>
            <EmptyDescription>
              {room
                ? "Bộ lọc của phòng đang loại hết kết quả. Thử bỏ một đề xuất trong phòng."
                : "Thử bỏ bộ lọc hoặc tìm bằng từ khoá khác."}
            </EmptyDescription>
          </EmptyHeader>
          {room ? (
            <Button variant="outline" render={<Link to={`/rooms/${room.code}`} />}>
              Mở phòng lọc nhóm
            </Button>
          ) : (
            <Button variant="outline" onClick={view.filters.resetAll}>
              Xoá bộ lọc
            </Button>
          )}
        </Empty>
      </div>
    )
  }

  return (
    <PlacesMap
      places={mapPlaces}
      selectedPlaceId={selectedPlaceId}
      onSelectPlace={onSelectPlace}
      onClearSelection={onClearSelection}
      activeCategory={view.filters.category}
      onCategorySelect={view.filters.setCategory}
      userCoordinates={view.coordinates}
      height="h-full"
      className="rounded-none border-0"
      onViewportChange={setRawBounds}
      isPlacesLoading={mapQuery.isPending || mapQuery.isFetching}
      isPlaceholderData={mapQuery.isPlaceholderData}
      isEmptyViewport={isEmptyViewport}
      selectedDistrict={selectedDistrict}
      onFitApplied={onFitApplied}
      totalPlaces={mapQuery.data?.total}
      fitKey={fitKey}
    />
  )
}

export function MapPage() {
  const view = useDiscoverView({ fetchList: false })
  const { room } = view
  const [rawBounds, setRawBounds] = useState<MapBounds | null>(null)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const bounds = useDebounce(rawBounds, 300)

  const filterKey = [
    view.serverFilters.category,
    view.serverFilters.district ?? "all",
    view.serverFilters.query,
    view.serverFilters.priceMax ?? "all",
    JSON.stringify(view.serverFilters.room ?? null),
  ].join("|")
  const coordKey = view.coordinates ? `${view.coordinates.lat},${view.coordinates.lng}` : ""
  const fitKey = `${filterKey}|${coordKey}`

  const [fittedFilterKey, setFittedFilterKey] = useState<string | null>(null)
  const needsRefit = fittedFilterKey !== filterKey
  const effectiveBounds = needsRefit ? null : bounds

  const mapQuery = useMapPlaces(view.serverFilters, effectiveBounds, {
    allowUnbounded: needsRefit,
  })
  const mapPlaces = mapQuery.data?.items ?? []
  const selectedDistrict =
    !room && view.filters.district !== "all" ? view.filters.district : undefined
  const isEmptyViewport =
    bounds !== null && !needsRefit && !mapQuery.isFetching && mapPlaces.length === 0

  return (
    <div className="relative h-[calc(100dvh-4.05rem-5rem)] w-full overflow-hidden lg:h-[calc(100dvh-4.05rem)]">
      <h1 className="sr-only">Bản đồ địa điểm Đà Nẵng</h1>

      {/* Thanh lọc nổi bằng kính mờ phía trên bản đồ */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-1000 mx-auto max-w-6xl">
        <div className="pointer-events-auto">
          <DiscoverToolbar
            view={view}
            mode="map"
            floating
            totalOverride={mapQuery.data?.total}
            placesOverride={mapPlaces}
            isLoadingOverride={mapQuery.isFetching}
          />
        </div>
      </div>

      <MapContent
        view={view}
        mapQuery={mapQuery}
        mapPlaces={mapPlaces}
        selectedPlaceId={selectedPlaceId}
        onSelectPlace={(place) => setSelectedPlaceId(place.id)}
        onClearSelection={() => setSelectedPlaceId(null)}
        setRawBounds={setRawBounds}
        fitKey={fitKey}
        needsRefit={needsRefit}
        isEmptyViewport={isEmptyViewport}
        selectedDistrict={selectedDistrict}
        onFitApplied={() => setFittedFilterKey(filterKey)}
        room={room}
      />
    </div>
  )
}
