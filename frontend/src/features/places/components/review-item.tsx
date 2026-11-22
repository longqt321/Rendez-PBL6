import { PencilIcon, Trash2Icon } from "lucide-react"
import { Link } from "react-router"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Item } from "@/components/ui/item"
import { formatRelativeTime } from "@/lib/format"
import type { Review } from "../types/review"
import { ReviewTierBadge } from "./review-tier-badge"

interface ReviewItemProps {
  review: Review
  onEdit?: (review: Review) => void
  onDelete?: (review: Review) => void
}

export function ReviewItem({ review, onEdit, onDelete }: ReviewItemProps) {
  return (
    <Item
      variant="outline"
      render={<article />}
      role="listitem"
      className="flex-col items-stretch gap-2.5 rounded-surface bg-card p-4 shadow-(--shadow-soft)"
    >
      <header className="flex items-center gap-2.5">
        <Link to={`/u/${review.author.handle}`} className="shrink-0">
          <Avatar size="lg">
            <AvatarFallback className="bg-accent font-bold text-accent-foreground">
              {review.author.initials}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <Link
            to={`/u/${review.author.handle}`}
            className="truncate text-sm font-semibold hover:underline"
          >
            {review.author.name}
          </Link>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>@{review.author.handle}</span>
            {review.authorReviewCount !== undefined ? (
              <span>· {review.authorReviewCount} đánh giá</span>
            ) : null}
            {review.isFollowingAuthor ? (
              <Badge variant="secondary" className="px-1.5 py-0 text-xs font-medium">
                Đang theo dõi
              </Badge>
            ) : null}
          </div>
        </div>
        {review.isMine ? (
          <div className="flex items-center gap-1">
            {onEdit ? (
              <Button variant="ghost" size="sm" onClick={() => onEdit(review)}>
                <PencilIcon />
                Sửa
              </Button>
            ) : null}
            {onDelete ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(review)}
                aria-label="Xoá đánh giá"
              >
                <Trash2Icon />
                Xoá
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>
      <div className="flex flex-wrap items-center gap-2">
        <ReviewTierBadge tier={review.tier} />
        <Badge variant="secondary" className="text-xs font-normal">
          {formatRelativeTime(review.createdAt)}
        </Badge>
      </div>
      {review.recommendedDishes.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Món nên gọi:</span>
          {review.recommendedDishes.map((dish) => (
            <Badge key={dish} variant="outline" className="text-xs font-normal">
              {dish}
            </Badge>
          ))}
        </div>
      ) : null}
      {review.content ? (
        <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
          {review.content}
        </p>
      ) : null}
    </Item>
  )
}
