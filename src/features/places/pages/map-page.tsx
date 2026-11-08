import { SearchXIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
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
  const { filters } = view

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <DiscoverToolbar view={view} mode="map" />

      {view.isPending ? (
        <div className="mt-5 flex h-[60vh] items-center justify-center rounded-surface border border-dashed border-border">
          <span className="text-sm text-muted-foreground">Đang tải bản đồ…</span>
        </div>
      ) : view.isError ? (
        <Empty className="mt-10 border border-dashed border-border">
          <EmptyHeader>
            <EmptyTitle>Không tải được danh sách địa điểm</EmptyTitle>
            <EmptyDescription>Kiểm tra kết nối rồi thử lại.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={view.refetch}>
            Thử lại
          </Button>
        </Empty>
      ) : view.sortedPlaces.length === 0 ? (
        <Empty className="mt-10 border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon />
            </EmptyMedia>
            <EmptyTitle>Không có địa điểm nào trên bản đồ</EmptyTitle>
            <EmptyDescription>Thử bỏ bộ lọc hoặc tìm bằng từ khoá khác.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={filters.resetAll}>
            Xoá bộ lọc
          </Button>
        </Empty>
      ) : (
        <div className="mt-5">
          <PlacesMap
            places={view.sortedPlaces}
            userCoordinates={view.coordinates}
            height="h-[calc(100vh-230px)] min-h-[500px]"
          />
        </div>
      )}
    </div>
  )
}
