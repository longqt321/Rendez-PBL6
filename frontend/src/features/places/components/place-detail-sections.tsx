import { StarIcon } from "lucide-react"
import { ErrorState } from "@/components/shared/error-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Item, ItemActions, ItemContent, ItemGroup } from "@/components/ui/item"
import { PostCard } from "@/features/social/components/post-card"
import type { Post } from "@/features/social/types/post"
import { REVIEW_TIER_META } from "../lib/review-tier-meta"
import type { Review } from "../types/review"
import { ReviewForm } from "./review-form"
import { ReviewItem } from "./review-item"

import type { OpeningHoursDetail } from "@rendez/schema"

export function OpenStatusBadge({
  openState,
  detail,
}: Readonly<{
  openState?: boolean | null
  detail?: OpeningHoursDetail | null
}>) {
  if (detail) {
    if (detail.isOpen) {
      if (detail.closingSoon) {
        return (
          <Badge variant="outline" className="border-star/40 bg-star/10 font-medium text-star">
            {detail.statusLabel}
          </Badge>
        )
      }
      return <Badge className="bg-open text-open-foreground">{detail.statusLabel}</Badge>
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        {detail.statusLabel}
      </Badge>
    )
  }
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

export function ReviewTrigger({
  reviewFormVisible,
  myReview,
  editingReview,
  placeId,
  authorInitials,
  suggestedDishes,
  closeReviewForm,
  setEditingReview,
  setShowReviewForm,
}: Readonly<{
  reviewFormVisible: boolean
  myReview?: Review | null
  editingReview: Review | null
  placeId: string
  authorInitials: string
  suggestedDishes: string[]
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
          suggestedDishes={suggestedDishes}
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
            Bạn đã đánh giá "{REVIEW_TIER_META[myReview.tier].label}" cho địa điểm này.
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

export function ReviewsListContent({
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
        <EmptyDescription>Chưa có đánh giá nào cho địa điểm này.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function PostsTabContent({
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
