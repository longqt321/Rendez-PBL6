import { SearchXIcon } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { DiscoverToolbar } from "../components/discover-toolbar"
import { PlaceCard } from "../components/place-card"
import { PlaceCardSkeleton } from "../components/place-card-skeleton"
import { useDiscoverView } from "../hooks/use-discover-view"

/** Chiều cao ảnh cho skeleton — chỉ là hình thức chờ, không phải dữ liệu. */
const SKELETON_HEIGHTS = [320, 400, 280, 360, 440, 300, 380, 340, 420]

/**
 * Trang khám phá — `/discover`: dạng lưới.
 *
 * Chia sẻ toàn bộ bộ lọc với `/map` qua `useDiscoverView` (bộ lọc nằm trên URL),
 * nên chuyển giữa hai trang không mất search/filter.
 */
export function DiscoverPage() {
  const view = useDiscoverView()
  const { filters, room } = view

  const sentinelRef = useInfiniteScroll({
    hasNextPage: view.hasNextPage,
    isFetchingNextPage: view.isFetchingNextPage,
    fetchNextPage: view.fetchNextPage,
  })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <h1 className="sr-only">Khám phá địa điểm Đà Nẵng</h1>
      <DiscoverToolbar view={view} mode="grid" />

      {view.isPending ? (
        <ul className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <li key={index}>
              <PlaceCardSkeleton imageHeight={SKELETON_HEIGHTS[index % SKELETON_HEIGHTS.length]} />
            </li>
          ))}
        </ul>
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
            <EmptyTitle>Không tìm thấy quán ăn phù hợp</EmptyTitle>
            <EmptyDescription>
              {room
                ? "Bộ lọc của phòng đang loại hết kết quả. Thử bỏ một đề xuất trong phòng."
                : filters.district !== "all"
                  ? `Chưa có địa điểm phù hợp tại Quận ${filters.district}. Thử chọn quận khác hoặc xoá bộ lọc.`
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
        <>
          <ul className="mt-5 grid grid-cols-2 items-start gap-4 md:grid-cols-3">
            {view.placesWithDistance.map(({ place, distanceKm }) => (
              <li key={place.id} className="lg:h-full">
                <PlaceCard place={place} distanceKm={distanceKm} />
              </li>
            ))}
          </ul>

          <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />

          <div className="mt-8 flex justify-center">
            {view.hasNextPage ? (
              <Button
                variant="outline"
                onClick={view.fetchNextPage}
                disabled={view.isFetchingNextPage}
              >
                {view.isFetchingNextPage ? <Spinner aria-label="Đang tải thêm địa điểm" /> : null}
                {view.isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Đã hiển thị hết địa điểm tại Đà Nẵng.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
