import { SearchXIcon } from "lucide-react"
import { Link } from "react-router"
import { PageContainer, PageHeader } from "@/components/layout/page-primitives"
import { ErrorState } from "@/components/shared/error-state"
import { LoadMore } from "@/components/shared/load-more"
import { StaggerItem, StaggerList } from "@/components/shared/motion-primitives"
import { SectionHeading } from "@/components/shared/section-heading"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { DailyPicksSection } from "../components/daily-picks-section"
import { DidYouMean } from "../components/did-you-mean"
import { DiscoverToolbar } from "../components/discover-toolbar"
import { PlaceCard } from "../components/place-card"
import { PlaceCardSkeleton } from "../components/place-card-skeleton"
import { RecentlyViewedSection } from "../components/recently-viewed-section"
import { RecommendedSection } from "../components/recommended-section"
import { useDiscoverView } from "../hooks/use-discover-view"

const SKELETON_HEIGHTS = [240, 280, 220, 260, 290, 230]

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
      <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
    <section className="mt-8" aria-labelledby="discover-grid-heading">
      <SectionHeading id="discover-grid-heading">Tất cả địa điểm</SectionHeading>

      <StaggerList className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {view.placesWithDistance.map(({ place, distanceKm }) => (
          <StaggerItem key={place.id} className="h-full">
            <PlaceCard place={place} distanceKm={distanceKm} />
          </StaggerItem>
        ))}
      </StaggerList>

      <LoadMore
        sentinelRef={sentinelRef}
        hasNextPage={view.hasNextPage}
        isFetchingNextPage={view.isFetchingNextPage}
        onLoadMore={view.fetchNextPage}
        loadingLabel="Đang tải thêm địa điểm"
        endMessage="Đã hiển thị hết địa điểm tại Đà Nẵng."
        className="mt-8"
      />
    </section>
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
    <PageContainer size="wide">
      <PageHeader title="Khám phá địa điểm Đà Nẵng" />

      <DiscoverToolbar view={view} mode="grid" />

      <DidYouMean suggestion={view.meta?.didYouMean} onSelect={filters.setDraftQuery} />

      <DailyPicksSection />
      <RecommendedSection />
      <RecentlyViewedSection />

      <DiscoverContent view={view} sentinelRef={sentinelRef} />
    </PageContainer>
  )
}
