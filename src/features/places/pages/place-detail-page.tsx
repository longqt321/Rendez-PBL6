import { useState } from "react"
import { Link, useParams } from "react-router"
import { CameraIcon, MapPinIcon, StarIcon, FolderPlusIcon } from "lucide-react"
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
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SeedImage } from "@/components/shared/seed-image"
import { formatCount, formatRating } from "@/lib/format"
import { categoryLabel } from "../lib/category-meta"
import { priceLevelAriaLabel, priceLevelLabel } from "../lib/price-level"
import { usePlace } from "../hooks/use-place"
import { usePlacePosts } from "../hooks/use-place-posts"
import { usePlaceReviews } from "../hooks/use-place-reviews"
import { useMe } from "@/features/profile/hooks/use-me"
import { ReviewForm } from "../components/review-form"
import { ReviewItem } from "../components/review-item"
import type { Review } from "../types/review"
import { SaveToCollectionDialog } from "@/features/collections/components/save-to-collection-dialog"
import { PlaceMiniMap } from "../components/place-mini-map"
import { CheckInDialog } from "../components/check-in-dialog"

/** Trang chi tiết địa điểm — `/discover/:id`. */
export function PlaceDetailPage() {
  const { id } = useParams()
  const placeId = id ?? ""
  const { data: place, isPending, isError } = usePlace(placeId)
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
      <div
        className="flex items-center justify-center py-24"
        role="status"
        aria-label="Đang tải địa điểm"
      >
        <Spinner className="size-6" />
      </div>
    )
  }

  if (isError || !place) {
    return (
      <div className="mx-auto max-w-md py-20">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MapPinIcon />
            </EmptyMedia>
            <EmptyTitle>Không tìm thấy địa điểm</EmptyTitle>
            <EmptyDescription>Địa điểm này chưa được đăng hoặc không tồn tại.</EmptyDescription>
          </EmptyHeader>
        </Empty>
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

      <div className="mt-4 overflow-hidden rounded-surface border border-border bg-card shadow-(--shadow-soft)">
        <SeedImage
          seed={place.imageSeed}
          height={280}
          className="w-full"
          alt={`Ảnh minh hoạ ${place.name}`}
        />

        <div className="flex flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-xl font-bold tracking-tight">{place.name}</h1>
            <Badge variant="secondary">{categoryLabel(place.category)}</Badge>
          </div>

          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {place.address}, {place.city}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-bold text-foreground">
              <StarIcon className="size-3.5 fill-current" aria-hidden="true" />
              {formatRating(place.rating)}
            </span>
            <span>{formatCount(place.reviewCount)} đánh giá</span>
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
          </div>
        </div>
      </div>

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
              <section className="rounded-md border bg-card p-4" aria-label="Form đánh giá">
                <ReviewForm
                  key={editingReview?.id ?? "new"}
                  placeId={placeId}
                  myReview={editingReview}
                  authorInitials={me?.initials ?? "Tôi"}
                  onDone={closeReviewForm}
                />
              </section>
            ) : myReview ? (
              <div className="flex items-center justify-between gap-3 rounded-md border bg-card p-4">
                <p className="text-sm text-muted-foreground">
                  Bạn đã đánh giá {myReview.rating}/5 sao cho địa điểm này.
                </p>
                <Button variant="outline" size="sm" onClick={() => setEditingReview(myReview)}>
                  Sửa đánh giá
                </Button>
              </div>
            ) : (
              <Button className="self-start" onClick={() => setShowReviewForm(true)}>
                <StarIcon />
                Viết đánh giá
              </Button>
            )}

            {reviewsPending ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Đang tải đánh giá…</p>
            ) : reviews && reviews.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {reviews.map((review) => (
                  <li key={review.id}>
                    <ReviewItem
                      review={review}
                      onEdit={review.isMine ? setEditingReview : undefined}
                    />
                  </li>
                ))}
              </ul>
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
            <ul className="flex flex-col gap-3">
              {posts.map((post) => (
                <li key={post.id}>
                  <Link
                    to={`/post/${post.id}`}
                    className="flex items-start gap-3 rounded-surface border border-border/15 p-3 transition-colors hover:bg-muted"
                  >
                    <SeedImage
                      seed={post.imageSeed}
                      height={120}
                      className="w-20 shrink-0 rounded-thumb"
                      alt=""
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {post.author.name} · {post.commentCount} bình luận · {post.likeCount} thích
                      </p>
                      <p className="mt-1 line-clamp-3 text-sm leading-snug">{post.caption}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="overview" className="mt-4 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h3 className="font-heading text-base font-semibold">Vị trí & Chỉ đường</h3>
            <PlaceMiniMap place={place} />
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-heading text-base font-semibold">Giới thiệu</h3>
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
