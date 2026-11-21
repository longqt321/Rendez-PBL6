import { useEffect, useState } from "react"
import { Link, useParams } from "react-router"
import {
  CameraIcon,
  ExpandIcon,
  FlagIcon,
  FolderPlusIcon,
  MapPinIcon,
  SparklesIcon,
  StarIcon,
} from "lucide-react"
import {
  PageContainer,
  SplitLayout,
  SplitMain,
  StickyAside,
  SurfaceCard,
} from "@/components/layout/page-primitives"
import { CoverImage } from "@/components/shared/cover-image"
import { ErrorState } from "@/components/shared/error-state"
import { ImageLightbox } from "@/components/shared/image-lightbox"
import { placeImageAlt } from "@/components/shared/place-image-alt"
import { SectionHeading } from "@/components/shared/section-heading"
import { ShareButton } from "@/components/shared/share-button"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Item, ItemActions, ItemContent, ItemGroup } from "@/components/ui/item"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SaveToCollectionDialog } from "@/features/collections/components/save-to-collection-dialog"
import { useMe } from "@/features/profile/hooks/use-me"
import { PostCard } from "@/features/social/components/post-card"
import type { Post } from "@/features/social/types/post"
import { isNotFoundError } from "@/lib/axios"
import { formatCount, formatRating } from "@/lib/format"
import { CheckInDialog } from "../components/check-in-dialog"
import { PlaceCard } from "../components/place-card"
import { PlaceMiniMap } from "../components/place-mini-map"
import { ReportPlaceDialog } from "../components/report-place-dialog"
import { ReviewDeleteDialog } from "../components/review-delete-dialog"
import { ReviewForm } from "../components/review-form"
import { ReviewItem } from "../components/review-item"
import { useDiscoverPlaces } from "../hooks/use-discover-places"
import { usePlace } from "../hooks/use-place"
import { usePlacePosts } from "../hooks/use-place-posts"
import { usePlaceReviews } from "../hooks/use-place-reviews"
import { categoryLabel } from "../lib/category-meta"
import { formatLocation } from "../lib/format-location"
import { isOpenNow } from "../lib/opening-hours"
import { priceLevelAriaLabel, priceLevelLabel } from "../lib/price-level"
import { GUEST_SCOPE, recordPlaceView } from "../lib/recently-viewed"
import type { Review } from "../types/review"

export function PlaceDetailPage() {
  const { id } = useParams()
  const placeId = id ?? ""
  const { data: place, isPending, isError, error, refetch } = usePlace(placeId)
  const {
    data: postsData,
    isPending: postsPending,
    isError: postsError,
    refetch: refetchPosts,
  } = usePlacePosts(placeId)
  const posts = postsData?.pages.flatMap((page) => page.items) ?? []
  const {
    data: reviews,
    isPending: reviewsPending,
    isError: reviewsError,
    refetch: refetchReviews,
  } = usePlaceReviews(placeId)
  const { data: me, isPending: mePending } = useMe()

  const similarQuery = useDiscoverPlaces(
    {
      category: place?.category ?? "all",
      district: place?.district ?? "all",
      query: "",
      sort: "rating",
    },
    { enabled: place !== undefined },
  )
  const similarPlaces = (similarQuery.data?.pages[0]?.items ?? [])
    .filter((item) => item.id !== placeId)
    .slice(0, 6)

  useEffect(() => {
    if (mePending) return
    if (place?.id !== undefined) recordPlaceView(place.id, me?.id ?? GUEST_SCOPE)
  }, [place?.id, me?.id, mePending])

  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [deletingReview, setDeletingReview] = useState<Review | null>(null)
  const [heroLightboxOpen, setHeroLightboxOpen] = useState(false)
  const myReview = reviews?.find((review) => review.isMine) ?? null
  const reviewFormVisible = showReviewForm || editingReview !== null

  function closeReviewForm() {
    setEditingReview(null)
    setShowReviewForm(false)
  }

  if (isPending) {
    return (
      <PageContainer size="default">
        <h1 className="sr-only">Chi tiết địa điểm</h1>
        <div className="flex items-center justify-center py-24">
          <Spinner className="size-6" aria-label="Đang tải thông tin địa điểm" />
        </div>
      </PageContainer>
    )
  }

  if (isError || !place) {
    const notFound = isNotFoundError(error) || (!isError && !place)
    return (
      <PageContainer size="narrow" className="py-20">
        <h1 className="sr-only">{notFound ? "Không tìm thấy địa điểm" : "Lỗi tải địa điểm"}</h1>
        <ErrorState
          icon={<MapPinIcon />}
          title={notFound ? "Không tìm thấy địa điểm" : "Không tải được địa điểm"}
          description={notFound ? "Địa điểm này chưa được đăng hoặc không tồn tại." : undefined}
          onRetry={notFound ? undefined : () => void refetch()}
        >
          {notFound ? (
            <Button render={<Link to="/discover" />}>Về trang Khám phá</Button>
          ) : undefined}
        </ErrorState>
      </PageContainer>
    )
  }

  const openState = isOpenNow(place.openingHours ?? null)
  const hasRealImage = Boolean(place.imageUrl)

  return (
    <PageContainer size="wide">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to="/discover" />}>Khám phá</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{place.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Adaptive Editorial Hero */}
      <SurfaceCard padding="none" className="overflow-hidden">
        {hasRealImage ? (
          <div className="relative">
            <CoverImage
              src={place.imageUrl}
              placeholder={place.category}
              name={place.name}
              height={320}
              className="w-full"
              alt={placeImageAlt(place)}
              sizes="100vw"
              priority
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/65 via-foreground/15 to-transparent"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute top-3 right-3 gap-1.5 bg-background/85 backdrop-blur-sm"
                onClick={() => setHeroLightboxOpen(true)}
              >
                <ExpandIcon className="size-3.5" aria-hidden="true" />
                Xem ảnh lớn
              </Button>
            </CoverImage>
          </div>
        ) : (
          <CoverImage
            placeholder={place.category}
            name={place.name}
            height={168}
            className="w-full"
            alt={placeImageAlt(place)}
          />
        )}

        <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{categoryLabel(place.category)}</Badge>
              {place.district ? <Badge variant="outline">{place.district}</Badge> : null}
              {place.status === "closed" ? <Badge variant="destructive">Đã đóng cửa</Badge> : null}
              <OpenStatusBadge openState={openState} />
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {place.name}
            </h1>

            <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPinIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{formatLocation(place.address, place.city)}</span>
            </p>

            {place.description ? (
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {place.description}
              </p>
            ) : null}

            {place.tags.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5 pt-1">
                {place.tags.map((tag) => (
                  <li key={tag}>
                    <Badge variant="outline" className="font-normal">
                      #{tag}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* Rating Medallion */}
          <SurfaceCard variant="subtle" padding="sm" className="flex shrink-0 items-center gap-4">
            <div className="text-center">
              {place.reviewCount > 0 ? (
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-display text-3xl font-bold tabular-nums">
                    {formatRating(place.rating)}
                  </span>
                  <StarIcon className="size-4 fill-star text-star" aria-hidden="true" />
                </div>
              ) : (
                <span className="font-display text-xl font-bold text-muted-foreground">-</span>
              )}
              <p className="text-xs text-muted-foreground tabular-nums">
                {place.reviewCount > 0
                  ? `${formatCount(place.reviewCount)} đánh giá`
                  : "Chưa có đánh giá"}
              </p>
            </div>
            <div className="h-9 w-px bg-border" aria-hidden="true" />
            <div className="text-center">
              <span
                aria-label={priceLevelAriaLabel(place.priceLevel)}
                className="font-display text-lg font-bold"
              >
                {priceLevelLabel(place.priceLevel)}
              </span>
              <p className="text-xs text-muted-foreground">Mức giá</p>
            </div>
          </SurfaceCard>
        </div>
      </SurfaceCard>

      {/* 2-Column Editorial Split Layout */}
      <SplitLayout ratio="8-4" gap="lg" className="mt-8">
        <SplitMain span={8} className="space-y-6">
          {/* Biểu đồ phân bổ sao đánh giá */}
          {reviews && reviews.length > 0 ? (
            <RatingSummaryCard rating={place.rating} reviews={reviews} />
          ) : null}

          <Tabs defaultValue="reviews">
            <TabsList>
              <TabsTrigger value="reviews">
                Đánh giá{reviews && reviews.length > 0 ? ` (${reviews.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="posts">
                Bài đăng check-in{posts.length > 0 ? ` (${posts.length})` : ""}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reviews" className="mt-4">
              <div className="flex flex-col gap-4">
                <ReviewTrigger
                  reviewFormVisible={reviewFormVisible}
                  myReview={myReview}
                  editingReview={editingReview}
                  placeId={placeId}
                  authorInitials={me?.initials ?? "Tôi"}
                  closeReviewForm={closeReviewForm}
                  setEditingReview={setEditingReview}
                  setShowReviewForm={setShowReviewForm}
                />
                <ReviewsListContent
                  reviewsPending={reviewsPending}
                  reviewsError={reviewsError}
                  reviews={reviews}
                  refetchReviews={refetchReviews}
                  setEditingReview={setEditingReview}
                  setDeletingReview={setDeletingReview}
                />
              </div>
            </TabsContent>

            <TabsContent value="posts" className="mt-4">
              <PostsTabContent
                postsPending={postsPending}
                postsError={postsError}
                posts={posts}
                refetchPosts={refetchPosts}
              />
            </TabsContent>
          </Tabs>
        </SplitMain>

        {/* Cột phải Sticky: Luôn hiển thị Hành động & Bản đồ vị trí */}
        <StickyAside span={4} className="space-y-5">
          <SurfaceCard className="space-y-3">
            <SectionHeading>Tương tác tại địa điểm</SectionHeading>
            <div className="flex flex-col gap-2">
              <CheckInDialog place={place}>
                <Button className="w-full justify-center">
                  <CameraIcon />
                  Đăng bài check-in tại đây
                </Button>
              </CheckInDialog>

              <SaveToCollectionDialog placeId={placeId} placeName={place.name}>
                <Button variant="outline" className="w-full justify-center">
                  <FolderPlusIcon />
                  Lưu vào bộ sưu tập
                </Button>
              </SaveToCollectionDialog>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <ShareButton title={place.name} url={`/discover/${placeId}`} size="default" />
                <ReportPlaceDialog place={place}>
                  <Button variant="ghost" className="text-muted-foreground">
                    <FlagIcon />
                    Báo cáo
                  </Button>
                </ReportPlaceDialog>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-3">
            <SectionHeading>Vị trí & Chỉ đường</SectionHeading>
            <PlaceMiniMap place={place} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {place.name} nằm ở {place.city}. Địa điểm do cộng đồng đóng góp và được kiểm duyệt
              trước khi hiển thị.
            </p>
          </SurfaceCard>
        </StickyAside>
      </SplitLayout>

      {/* Dải Địa điểm tương tự */}
      {similarPlaces.length > 0 ? (
        <section aria-labelledby="similar-places-heading" className="mt-12">
          <Carousel opts={{ align: "start" }} className="w-full">
            <div className="flex items-center justify-between gap-2">
              <SectionHeading
                id="similar-places-heading"
                icon={<SparklesIcon className="size-4 text-primary" aria-hidden="true" />}
              >
                Quán tương tự tại Đà Nẵng
              </SectionHeading>
              <div className="flex items-center gap-1.5">
                <CarouselPrevious className="static size-8 translate-y-0" />
                <CarouselNext className="static size-8 translate-y-0" />
              </div>
            </div>

            <CarouselContent className="mt-4 -ml-4">
              {similarPlaces.map((similar) => (
                <CarouselItem
                  key={similar.id}
                  className="basis-[85%] pl-4 sm:basis-1/2 lg:basis-1/3"
                >
                  <PlaceCard place={similar} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </section>
      ) : null}

      <ReviewDeleteDialog
        placeId={placeId}
        open={deletingReview !== null}
        onClose={() => setDeletingReview(null)}
        onDeleted={() => {
          if (editingReview?.id === deletingReview?.id) {
            closeReviewForm()
          }
        }}
      />

      {place.imageUrl ? (
        <ImageLightbox
          images={[place.imageUrl]}
          index={0}
          open={heroLightboxOpen}
          onClose={() => setHeroLightboxOpen(false)}
          altPrefix={place.name}
        />
      ) : null}
    </PageContainer>
  )
}

function RatingSummaryCard({ rating, reviews }: Readonly<{ rating: number; reviews: Review[] }>) {
  const total = reviews.length
  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }))

  return (
    <SurfaceCard variant="subtle" padding="md">
      <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-12">
        <div className="text-center sm:col-span-4">
          <p className="font-display text-4xl font-bold tracking-tight tabular-nums">
            {formatRating(rating)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            Dựa trên {formatCount(total)} đánh giá
          </p>
        </div>

        <div className="space-y-1.5 sm:col-span-8">
          {counts.map(({ star, count }) => {
            const percent = total > 0 ? Math.round((count / total) * 100) : 0
            return (
              <div key={star} className="flex items-center gap-2.5 text-xs">
                <span className="flex w-8 shrink-0 items-center gap-0.5 font-medium tabular-nums">
                  {star}
                  <StarIcon className="size-3 fill-star text-star" aria-hidden="true" />
                </span>
                <Progress
                  value={percent}
                  className="flex-1"
                  aria-label={`${star} sao: ${percent}%`}
                />
                <span className="w-8 shrink-0 text-right text-muted-foreground tabular-nums">
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </SurfaceCard>
  )
}

function OpenStatusBadge({ openState }: Readonly<{ openState: boolean | null }>) {
  if (openState === true) {
    return <Badge className="bg-open text-open-foreground">Đang mở cửa</Badge>
  }
  if (openState === false) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Đang đóng cửa
      </Badge>
    )
  }
  return null
}

function ReviewTrigger({
  reviewFormVisible,
  myReview,
  editingReview,
  placeId,
  authorInitials,
  closeReviewForm,
  setEditingReview,
  setShowReviewForm,
}: Readonly<{
  reviewFormVisible: boolean
  myReview?: Review | null
  editingReview: Review | null
  placeId: string
  authorInitials: string
  closeReviewForm: () => void
  setEditingReview: (review: Review | null) => void
  setShowReviewForm: (show: boolean) => void
}>) {
  if (reviewFormVisible) {
    return (
      <Card className="p-4" role="region" aria-label="Form đánh giá">
        <ReviewForm
          key={editingReview?.id ?? "new"}
          placeId={placeId}
          myReview={editingReview}
          authorInitials={authorInitials}
          onDone={closeReviewForm}
        />
      </Card>
    )
  }
  if (myReview) {
    return (
      <Item variant="outline" className="justify-between gap-3 p-4">
        <ItemContent>
          <p className="text-sm text-muted-foreground">
            Bạn đã đánh giá {myReview.rating}/5 sao cho địa điểm này.
          </p>
        </ItemContent>
        <ItemActions>
          <Button variant="outline" size="sm" onClick={() => setEditingReview(myReview)}>
            Sửa đánh giá
          </Button>
        </ItemActions>
      </Item>
    )
  }
  return (
    <Button className="self-start" onClick={() => setShowReviewForm(true)}>
      <StarIcon />
      Viết đánh giá
    </Button>
  )
}

function ReviewsListContent({
  reviewsPending,
  reviewsError,
  reviews,
  refetchReviews,
  setEditingReview,
  setDeletingReview,
}: Readonly<{
  reviewsPending: boolean
  reviewsError: boolean
  reviews?: Review[]
  refetchReviews: () => unknown
  setEditingReview: (review: Review | null) => void
  setDeletingReview: (review: Review | null) => void
}>) {
  if (reviewsPending) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Đang tải đánh giá…</p>
  }
  if (reviewsError) {
    return <ErrorState variant="plain" title="Không tải được đánh giá" onRetry={refetchReviews} />
  }
  if (reviews && reviews.length > 0) {
    return (
      <ItemGroup className="gap-3">
        {reviews.map((review) => (
          <ReviewItem
            key={review.id}
            review={review}
            onEdit={review.isMine ? setEditingReview : undefined}
            onDelete={review.isMine ? setDeletingReview : undefined}
          />
        ))}
      </ItemGroup>
    )
  }
  return (
    <Empty className="mt-2">
      <EmptyHeader>
        <EmptyTitle>Chưa có đánh giá nào</EmptyTitle>
        <EmptyDescription>Hãy là người đầu tiên chia sẻ trải nghiệm tại đây.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function PostsTabContent({
  postsPending,
  postsError,
  posts,
  refetchPosts,
}: Readonly<{
  postsPending: boolean
  postsError: boolean
  posts: Post[]
  refetchPosts: () => unknown
}>) {
  if (postsPending) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Đang tải bài đăng…</p>
  }
  if (postsError) {
    return <ErrorState variant="plain" title="Không tải được bài đăng" onRetry={refetchPosts} />
  }
  if (posts.length === 0) {
    return (
      <Empty className="mt-2">
        <EmptyHeader>
          <EmptyTitle>Chưa có bài đăng nào</EmptyTitle>
          <EmptyDescription>Các bài gắn địa điểm này sẽ xuất hiện ở đây.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <ul className="flex flex-col gap-4">
      {posts.map((post) => (
        <li key={post.id}>
          <PostCard post={post} />
        </li>
      ))}
    </ul>
  )
}
