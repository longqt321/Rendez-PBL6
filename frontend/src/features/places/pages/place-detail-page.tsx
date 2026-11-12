import { useState } from "react"
import { Link, useParams } from "react-router"
import { CameraIcon, FlagIcon, MapPinIcon, StarIcon, FolderPlusIcon } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/shared/error-state"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Item, ItemActions, ItemContent, ItemGroup } from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CoverImage } from "@/components/shared/cover-image"
import { placeImageAlt } from "@/components/shared/place-image-alt"
import { SectionHeading } from "@/components/shared/section-heading"
import { ShareButton } from "@/components/shared/share-button"
import { formatCount, formatRating } from "@/lib/format"
import { categoryLabel } from "../lib/category-meta"
import { priceLevelAriaLabel, priceLevelLabel } from "../lib/price-level"
import { usePlace } from "../hooks/use-place"
import { usePlacePosts } from "../hooks/use-place-posts"
import { usePlaceReviews } from "../hooks/use-place-reviews"
import { useMe } from "@/features/profile/hooks/use-me"
import { isNotFoundError } from "@/lib/axios"
import { ReviewForm } from "../components/review-form"
import { ReviewItem } from "../components/review-item"
import type { Review } from "../types/review"
import { SaveToCollectionDialog } from "@/features/collections/components/save-to-collection-dialog"
import { PlaceMiniMap } from "../components/place-mini-map"
import { CheckInDialog } from "../components/check-in-dialog"
import { ReportPlaceDialog } from "../components/report-place-dialog"

/** Trang chi tiết địa điểm — `/discover/:id`. */
export function PlaceDetailPage() {
  const { id } = useParams()
  const placeId = id ?? ""
  const { data: place, isPending, isError, error, refetch } = usePlace(placeId)
  const { data: postsData, isPending: postsPending } = usePlacePosts(placeId)
  const posts = postsData?.pages.flatMap((page) => page.items) ?? []
  const { data: reviews, isPending: reviewsPending } = usePlaceReviews(placeId)
  const { data: me } = useMe()
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const myReview = reviews?.find((review) => review.isMine) ?? null
  const reviewFormVisible = showReviewForm || editingReview !== null

  function closeReviewForm() {
    setEditingReview(null)
    setShowReviewForm(false)
  }

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-6 lg:px-8 lg:py-8">
        <h1 className="sr-only">Chi tiết địa điểm</h1>
        <div className="flex items-center justify-center py-24">
          <Spinner className="size-6" aria-label="Đang tải thông tin địa điểm" />
        </div>
      </div>
    )
  }

  if (isError || !place) {
    // 404 = địa điểm không tồn tại (thử lại vô ích); lỗi khác (mạng/5xx) = thử lại được.
    const notFound = isNotFoundError(error) || (!isError && !place)
    return (
      <div className="mx-auto max-w-md px-4 py-20">
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
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 lg:px-8 lg:py-8">
      <Breadcrumb>
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

      <Card className="mt-4 gap-0 p-0">
        <CoverImage
          src={place.imageUrl}
          placeholder={place.category}
          height={280}
          className="w-full rounded-t-xl"
          alt={placeImageAlt(place)}
          // Hero chiếm toàn chiều rộng khung nội dung → 100vw; ưu tiên LCP.
          sizes="100vw"
          priority
        />

        <CardContent className="flex flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-xl font-bold tracking-tight">{place.name}</h1>
            <Badge variant="secondary">{categoryLabel(place.category)}</Badge>
            {place.status === "closed" ? <Badge variant="destructive">Đã đóng cửa</Badge> : null}
          </div>

          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {place.address}, {place.city}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {place.reviewCount > 0 ? (
              <>
                <span className="flex items-center gap-1 font-bold text-foreground">
                  <StarIcon className="size-3.5 fill-current" aria-hidden="true" />
                  {formatRating(place.rating)}
                </span>
                <span>{formatCount(place.reviewCount)} đánh giá</span>
              </>
            ) : (
              <span>Chưa có đánh giá</span>
            )}
            <span aria-label={priceLevelAriaLabel(place.priceLevel)} className="font-bold">
              {priceLevelLabel(place.priceLevel)}
            </span>
          </div>

          <ul className="mt-1 flex flex-wrap gap-1.5">
            {place.tags.map((tag) => (
              <li key={tag}>
                <Badge variant="outline">#{tag}</Badge>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SaveToCollectionDialog placeId={placeId} placeName={place.name}>
              <Button variant="outline">
                <FolderPlusIcon />
                Lưu vào bộ sưu tập
              </Button>
            </SaveToCollectionDialog>
            <CheckInDialog place={place}>
              <Button>
                <CameraIcon />
                Đăng bài check-in tại đây
              </Button>
            </CheckInDialog>
            <ShareButton title={place.name} url={`/discover/${placeId}`} />
            <ReportPlaceDialog place={place}>
              <Button variant="ghost" className="text-muted-foreground">
                <FlagIcon />
                Báo cáo
              </Button>
            </ReportPlaceDialog>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="reviews" className="mt-6">
        <TabsList>
          <TabsTrigger value="reviews">
            Đánh giá{reviews && reviews.length > 0 ? ` (${reviews.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="posts">Bài đăng</TabsTrigger>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="mt-4">
          <div className="flex flex-col gap-4">
            {reviewFormVisible ? (
              <Card className="p-4" role="region" aria-label="Form đánh giá">
                <ReviewForm
                  key={editingReview?.id ?? "new"}
                  placeId={placeId}
                  myReview={editingReview}
                  authorInitials={me?.initials ?? "Tôi"}
                  onDone={closeReviewForm}
                />
              </Card>
            ) : myReview ? (
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
            ) : (
              <Button className="self-start" onClick={() => setShowReviewForm(true)}>
                <StarIcon />
                Viết đánh giá
              </Button>
            )}

            {reviewsPending ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Đang tải đánh giá…</p>
            ) : reviews && reviews.length > 0 ? (
              <ItemGroup className="gap-3">
                {reviews.map((review) => (
                  <ReviewItem
                    key={review.id}
                    review={review}
                    onEdit={review.isMine ? setEditingReview : undefined}
                  />
                ))}
              </ItemGroup>
            ) : (
              <Empty className="mt-2">
                <EmptyHeader>
                  <EmptyTitle>Chưa có đánh giá nào</EmptyTitle>
                  <EmptyDescription>
                    Hãy là người đầu tiên chia sẻ trải nghiệm tại đây.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </TabsContent>

        <TabsContent value="posts" className="mt-4">
          {postsPending ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Đang tải bài đăng…</p>
          ) : posts.length === 0 ? (
            <Empty className="mt-2">
              <EmptyHeader>
                <EmptyTitle>Chưa có bài đăng nào</EmptyTitle>
                <EmptyDescription>Các bài gắn địa điểm này sẽ xuất hiện ở đây.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ItemGroup className="gap-3">
              {posts.map((post) => (
                <Item
                  key={post.id}
                  variant="outline"
                  render={<Link to={`/post/${post.id}`} />}
                  className="items-start gap-3 rounded-surface p-3 hover:bg-muted"
                >
                  <ItemContent>
                    <p className="text-xs text-muted-foreground">
                      {post.author.name} · {post.commentCount} bình luận · {post.likeCount} thích
                    </p>
                    <p className="line-clamp-3 text-sm leading-snug">{post.caption}</p>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          )}
        </TabsContent>

        <TabsContent value="overview" className="mt-4 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <SectionHeading>Vị trí & Chỉ đường</SectionHeading>
            <PlaceMiniMap place={place} />
          </div>

          <div className="flex flex-col gap-2">
            <SectionHeading>Giới thiệu</SectionHeading>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              {place.name} nằm ở {place.city}. Địa điểm do cộng đồng đăng và được kiểm duyệt trước
              khi xuất hiện trên trang Khám phá.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
