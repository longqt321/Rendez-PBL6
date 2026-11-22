import { Link } from "react-router"
import { parseAsStringLiteral, useQueryState } from "nuqs"
import { CompassIcon, MapPinIcon, UsersIcon } from "lucide-react"
import {
  PageContainer,
  SplitLayout,
  SplitMain,
  StickyAside,
  SurfaceCard,
} from "@/components/layout/page-primitives"
import { ErrorState } from "@/components/shared/error-state"
import { LoadMore } from "@/components/shared/load-more"
import { StaggerItem, StaggerList } from "@/components/shared/motion-primitives"
import { SectionHeading } from "@/components/shared/section-heading"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMe } from "@/features/profile/hooks/use-me"
import { UserSuggestionsSection } from "@/features/search/components/user-suggestions-section"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { PostCard } from "../components/post-card"
import { PostComposer } from "../components/post-composer"
import { usePosts } from "../hooks/use-posts"
import type { Post, PostFeedFilter } from "../types/post"

interface SocialFeedContentProps {
  readonly isPending: boolean
  readonly isUpdating: boolean
  readonly isError: boolean
  readonly posts: Post[]
  readonly filter: PostFeedFilter
  readonly onRetry: () => void
}

function SocialFeedContent({
  isPending,
  isUpdating,
  isError,
  posts,
  filter,
  onRetry,
}: SocialFeedContentProps) {
  if (isPending) {
    return (
      <div className="mt-4 flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`skel-feed-${index}`}
            className="flex flex-col gap-3 rounded-surface border border-border/50 bg-card p-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-48 w-full rounded-surface" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    )
  }
  if (isError) {
    return (
      <ErrorState className="mt-10" title="Không tải được bài đăng" size="sm" onRetry={onRetry} />
    )
  }
  if (posts.length === 0) {
    return (
      <Empty className="mt-10 border border-dashed border-border bg-card/50">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>Chưa có bài đăng nào</EmptyTitle>
          <EmptyDescription>
            {filter === "following"
              ? "Theo dõi ai đó để thấy bài của họ ở đây."
              : "Mục này chưa có bài. Thử chọn bộ lọc khác."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <StaggerList
      className={`mt-4 flex flex-col gap-4 transition-opacity duration-150 ${isUpdating ? "opacity-65" : ""}`}
    >
      {posts.map((post) => (
        <StaggerItem key={post.id}>
          <PostCard post={post} />
        </StaggerItem>
      ))}
    </StaggerList>
  )
}

const SOCIAL_FILTER_VALUES = ["all", "unplaced", "following", "mine"] as const

export function SocialPage() {
  const [rawFilter, setRawFilter] = useQueryState(
    "filter",
    parseAsStringLiteral(SOCIAL_FILTER_VALUES)
      .withDefault("all")
      .withOptions({ history: "replace" }),
  )
  const { data: me, isPending: mePending } = useMe()

  const filter: PostFeedFilter = rawFilter === "following" && !mePending && !me ? "all" : rawFilter

  function handleFilterChange(next: string) {
    if (!(SOCIAL_FILTER_VALUES as readonly string[]).includes(next)) return
    void setRawFilter(next === "all" ? null : (next as (typeof SOCIAL_FILTER_VALUES)[number]))
  }

  const {
    posts,
    isPending,
    isFetching,
    isPlaceholderData,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = usePosts({ filter })

  const sentinelRef = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  })

  return (
    <PageContainer size="wide">
      <h1 className="sr-only">Cộng đồng</h1>

      <SplitLayout ratio="8-4" gap="lg">
        <SplitMain span={8}>
          <PostComposer />

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <Tabs value={filter} onValueChange={handleFilterChange} className="w-full sm:w-auto">
              <TabsList className="max-w-full scrollbar-none overflow-x-auto">
                <TabsTrigger value="all">Tất cả</TabsTrigger>
                <TabsTrigger value="unplaced">Chưa gắn địa điểm</TabsTrigger>
                {me && <TabsTrigger value="following">Đang theo dõi</TabsTrigger>}
                <TabsTrigger value="mine">Của tôi</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <SocialFeedContent
            isPending={isPending}
            isUpdating={isFetching && isPlaceholderData}
            isError={isError}
            posts={posts}
            filter={filter}
            onRetry={() => {
              refetch().catch(() => {})
            }}
          />

          {posts.length > 0 ? (
            <LoadMore
              sentinelRef={sentinelRef}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={fetchNextPage}
              loadingLabel="Đang tải thêm bài đăng"
              endMessage="Đã hiển thị hết bài viết."
            />
          ) : null}
        </SplitMain>

        <StickyAside span={4} className="hidden space-y-5 lg:block">
          <SurfaceCard>
            <UserSuggestionsSection variant="sidebar" />
          </SurfaceCard>

          <SurfaceCard variant="subtle" className="space-y-3">
            <SectionHeading
              icon={<MapPinIcon className="size-4 text-primary" aria-hidden="true" />}
            >
              Khám phá nhanh
            </SectionHeading>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Gắn địa điểm vào bài đăng để bạn bè xem được vị trí quán trên bản đồ và lưu ngay vào
              bộ sưu tập.
            </p>
            <Button variant="outline" size="sm" className="w-full" render={<Link to="/discover" />}>
              <CompassIcon className="size-3.5" aria-hidden="true" />
              Mở danh sách địa điểm
            </Button>
          </SurfaceCard>
        </StickyAside>
      </SplitLayout>
    </PageContainer>
  )
}
