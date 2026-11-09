import { SearchXIcon } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/shared/error-state"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { PlacesMap } from "../components/places-map"
import { DiscoverToolbar } from "../components/discover-toolbar"
import { useDiscoverView } from "../hooks/use-discover-view"

/**
 * Trang bản đồ — `/map`: xem kết quả lọc trên bản đồ toàn màn hình.
 *
 * Cùng một bộ lọc với `/discover` (qua `useDiscoverView`, bộ lọc nằm trên URL)
 * nên chuyển giữa hai trang không mất search/filter — đúng yêu cầu "map là một
 * mục riêng nhưng vẫn giữ nguyên bộ lọc".
 */
export function MapPage() {
  const view = useDiscoverView()
  const { filters, room } = view

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <h1 className="sr-only">Bản đồ địa điểm Đà Nẵng</h1>
      <DiscoverToolbar view={view} mode="map" />

      {view.isPending ? (
        <Skeleton className="mt-5 h-[70dvh] min-h-105 rounded-surface" />
      ) : view.isError ? (
        <ErrorState
          className="mt-10"
          title="Không tải được danh sách địa điểm"
          onRetry={view.refetch}
        />
      ) : view.sortedPlaces.length === 0 ? (
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
          {/* Đang trong phòng thì bộ lọc chung quyết định kết quả — "Xoá bộ lọc"
              cá nhân không có tác dụng, đưa người dùng tới phòng thay vì nút vô hiệu. */}
          {room ? (
            <Button variant="outline" render={<Link to={`/rooms/${room.code}`} />}>
              Mở phòng lọc nhóm
            </Button>
          ) : (
            <Button variant="outline" onClick={filters.resetAll}>
              Xoá bộ lọc
            </Button>
          )}
        </Empty>
      ) : (
        <div className="mt-5">
          <PlacesMap
            places={view.sortedPlaces}
            userCoordinates={view.coordinates}
            height="h-[70dvh] min-h-105"
          />
        </div>
      )}
    </div>
  )
}
