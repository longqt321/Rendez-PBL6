import type { Review } from "../types/review"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router"
import {
  CameraIcon,
  ExpandIcon,
  FlagIcon,
  FolderPlusIcon,
  MapPinIcon,
  SparklesIcon,
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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SaveToCollectionDialog } from "@/features/collections/components/save-to-collection-dialog"
import { useMe } from "@/features/profile/hooks/use-me"
import { isNotFoundError } from "@/lib/axios"
import { formatCount } from "@/lib/format"
import { CheckInDialog } from "../components/check-in-dialog"
import { PlaceCard } from "../components/place-card"
import { PlaceMiniMap } from "../components/place-mini-map"
import {
  OpenStatusBadge,
  PostsTabContent,
  ReviewTrigger,
  ReviewsListContent,
} from "../components/place-detail-sections"
import { ReportPlaceDialog } from "../components/report-place-dialog"
import { ReviewDeleteDialog } from "../components/review-delete-dialog"
import { PlaceMediaTabs } from "../components/place-media-tabs"
import { PlaceTierSummary } from "../components/place-tier-summary"
import type { ReviewTier } from "@rendez/schema"
import { useDiscoverPlaces } from "../hooks/use-discover-places"
import { usePlace } from "../hooks/use-place"
import { usePlacePosts } from "../hooks/use-place-posts"
import { usePlaceReviews } from "../hooks/use-place-reviews"
import { categoryLabel } from "../lib/category-meta"
import { formatLocation } from "../lib/format-location"
import { isOpenNow } from "../lib/opening-hours"
import { priceLevelAriaLabel, priceLevelLabel } from "../lib/price-level"
import { GUEST_SCOPE, recordPlaceView } from "../lib/recently-viewed"

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
  const [selectedTier, setSelectedTier] = useState<ReviewTier | null>(null)
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

        <div className="flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-start md:justify-between">
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
          <SurfaceCard
            variant="subtle"
            padding="sm"
            className="flex w-full shrink-0 items-center justify-around gap-4 md:w-auto md:justify-start"
          >
            <div className="text-center">
              {place.reviewCount > 0 ? (
                place.reviewCount >= 5 ? (
                  <>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="font-display text-2xl font-bold tabular-nums">
                        {place.mustTryCount ?? 0}/{place.reviewCount}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Phải thử</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="font-display text-2xl font-bold tabular-nums">
                        {formatCount(place.reviewCount)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Đánh giá</p>
                  </>
                )
              ) : (
                <>
                  <span className="font-display text-xl font-bold text-muted-foreground">-</span>
                  <p className="text-xs text-muted-foreground">Chưa có đánh giá</p>
                </>
              )}
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
          <PlaceMediaTabs placeId={placeId} placeName={place.name} canUpload={Boolean(me)} />

          <PlaceTierSummary
            summary={place.tierSummary}
            topDishes={place.topRecommendedDishes}
            reviews={reviews}
            selectedTier={selectedTier}
            onSelectTier={setSelectedTier}
          />

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
                  suggestedDishes={(place.topRecommendedDishes ?? []).map((d) => d.dishName)}
                  closeReviewForm={closeReviewForm}
                  setEditingReview={setEditingReview}
                  setShowReviewForm={setShowReviewForm}
                />
                <ReviewsListContent
                  reviewsPending={reviewsPending}
                  reviewsError={reviewsError}
                  reviews={selectedTier ? reviews?.filter((r) => r.tier === selectedTier) : reviews}
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
