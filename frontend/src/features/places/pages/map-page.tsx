import { useState } from "react"
import { useDebounce } from "@uidotdev/usehooks"
import { SearchXIcon } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/shared/error-state"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import type { Room } from "@/features/rooms/types/room"
import { PlacesMap } from "../components/places-map"
import { DiscoverToolbar } from "../components/discover-toolbar"
import { useDiscoverView } from "../hooks/use-discover-view"
import { useMapPlaces } from "../hooks/use-map-places"
import type { MapBounds } from "../api/get-map-places"
import type { Place } from "../types/place"

interface MapContentProps {
  readonly view: ReturnType<typeof useDiscoverView>
  readonly mapQuery: ReturnType<typeof useMapPlaces>
  readonly mapPlaces: Place[]
  readonly setRawBounds: (bounds: MapBounds | null) => void
  readonly fitKey: string
  readonly room?: Room
}

function MapContent({ view, mapQuery, mapPlaces, setRawBounds, fitKey, room }: MapContentProps) {
  if (view.isPending) {
    return <Skeleton className="mt-5 h-[70dvh] min-h-105 rounded-surface" />
  }
  if (view.isError) {
    return (
      <ErrorState
        className="mt-10"
        title="Không tải được danh sách địa điểm"
        onRetry={view.refetch}
      />
    )
  }
  if (mapQuery.isError) {
    return (
      <ErrorState
        className="mt-10"
        title="Không tải được địa điểm trong vùng xem"
        onRetry={() => {
          mapQuery.refetch().catch(() => {})
        }}
      />
    )
  }
  if (view.sortedPlaces.length === 0) {
    return (
      <Empty className="mt-10 border border-dashed border-border">
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
    )
  }
  return (
    <div className="mt-5">
      <PlacesMap
        places={mapPlaces}
        userCoordinates={view.coordinates}
        height="h-[70dvh] min-h-105"
        onViewportChange={setRawBounds}
        isPlacesLoading={mapQuery.isPending}
        totalPlaces={mapQuery.data?.total}
        fitKey={fitKey}
      />
    </div>
  )
}

export function MapPage() {
  const view = useDiscoverView()
  const { room } = view
  // Bản đồ báo khung nhìn ngay khi pan/zoom xong; hoãn 300ms trước khi dùng làm
  // khoá truy vấn để kéo liên tục không bắn hàng loạt request (useDebounce của
  // @uidotdev/usehooks — không tự viết debounce).
  const [rawBounds, setRawBounds] = useState<MapBounds | null>(null)
  const bounds = useDebounce(rawBounds, 300)

  const mapQuery = useMapPlaces(view.serverFilters, bounds)
  const mapPlaces = mapQuery.data?.items ?? []

  const coordKey = view.coordinates ? `${view.coordinates.lat},${view.coordinates.lng}` : ""
  // Đổi bộ lọc / bật vị trí → căn lại tầm nhìn một lần.
  const fitKey = `${view.serverFilters.category}|${view.serverFilters.district ?? ""}|${view.serverFilters.query}|${view.serverFilters.room ? "room" : ""}|${coordKey}`

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <h1 className="sr-only">Bản đồ địa điểm Đà Nẵng</h1>
      <DiscoverToolbar view={view} mode="map" />
      <MapContent
        view={view}
        mapQuery={mapQuery}
        mapPlaces={mapPlaces}
        setRawBounds={setRawBounds}
        fitKey={fitKey}
        room={room}
      />
    </div>
  )
}
