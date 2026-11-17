import { SearchXIcon } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/shared/error-state"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { DiscoverToolbar } from "../components/discover-toolbar"
import { DidYouMean } from "../components/did-you-mean"
import { DailyPicksSection } from "../components/daily-picks-section"
import { PlaceCard } from "../components/place-card"
import { PlaceCardSkeleton } from "../components/place-card-skeleton"
import { RecommendedSection } from "../components/recommended-section"
import { RecentlyViewedSection } from "../components/recently-viewed-section"
import { useDiscoverView } from "../hooks/use-discover-view"

const SKELETON_HEIGHTS = [320, 400, 280, 360, 440, 300, 380, 340, 420]

function getEmptyDescription(room: unknown, district: string, priceMax: string): string {
  let text: string
  if (room) {
    text = "Bộ lọc của phòng đang loại hết kết quả. Thử bỏ một đề xuất trong phòng."
  } else if (district !== "all") {
    text = `Chưa có địa điểm phù hợp tại Quận ${district}. Thử chọn quận khác hoặc xoá bộ lọc.`
  } else {
    text = "Thử bỏ bộ lọc hoặc tìm bằng từ khoá khác."
  }
  if (priceMax !== "all") {
    text += " Thử chọn mức giá cao hơn."
  }
  return text
}

interface DiscoverContentProps {
  readonly view: ReturnType<typeof useDiscoverView>
  readonly sentinelRef: React.Ref<HTMLDivElement>
}

function DiscoverContent({ view, sentinelRef }: DiscoverContentProps) {
  const { filters, room } = view

  if (view.isPending) {
    return (
      <ul className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <li key={`skel-discover-${index}`}>
            <PlaceCardSkeleton imageHeight={SKELETON_HEIGHTS[index % SKELETON_HEIGHTS.length]} />
          </li>
        ))}
      </ul>
    )
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

  if (view.sortedPlaces.length === 0) {
    return (
      <Empty className="mt-10 border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchXIcon />
          </EmptyMedia>
          <EmptyTitle>Không tìm thấy quán ăn phù hợp</EmptyTitle>
          <EmptyDescription>
            {getEmptyDescription(room, filters.district, String(filters.priceMax))}
          </EmptyDescription>
        </EmptyHeader>
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
    )
  }

  return (
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
          <Button variant="outline" onClick={view.fetchNextPage} disabled={view.isFetchingNextPage}>
            {view.isFetchingNextPage ? <Spinner aria-label="Đang tải thêm địa điểm" /> : null}
            {view.isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Đã hiển thị hết địa điểm tại Đà Nẵng.</p>
        )}
      </div>
    </>
  )
}

export function DiscoverPage() {
  const view = useDiscoverView()
  const { filters } = view

  const sentinelRef = useInfiniteScroll({
    hasNextPage: view.hasNextPage,
    isFetchingNextPage: view.isFetchingNextPage,
    fetchNextPage: view.fetchNextPage,
  })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <h1 className="sr-only">Khám phá địa điểm Đà Nẵng</h1>
      <DiscoverToolbar view={view} mode="grid" />

      {/* Server gợi ý tên quán gần nhất khi từ khoá không khớp (pg_trgm). */}
      <DidYouMean suggestion={view.meta?.didYouMean} onSelect={filters.setDraftQuery} />

      {/* Dải gợi ý đứng trên lưới, độc lập với trạng thái lưới và bộ lọc. */}
      <DailyPicksSection />
      {/* Cá nhân hoá theo lịch sử tương tác — rỗng/chưa có endpoint thì tự ẩn. */}
      <RecommendedSection />
      {/* Lịch sử xem cục bộ (localStorage) — rỗng thì tự ẩn. */}
      <RecentlyViewedSection />

      <DiscoverContent view={view} sentinelRef={sentinelRef} />
    </div>
  )
}
