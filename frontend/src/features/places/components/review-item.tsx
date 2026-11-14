import { PencilIcon, Trash2Icon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Item } from "@/components/ui/item"
import { formatRelativeTime } from "@/lib/format"
import type { Review } from "../types/review"
import { RatingStars } from "./rating-stars"

interface ReviewItemProps {
  review: Review
  onEdit?: (review: Review) => void
  onDelete?: (review: Review) => void
}

/** Một đánh giá trong danh sách — chỉ hiển thị; nút sửa/xoá chỉ nhận khi `isMine`. */
export function ReviewItem({ review, onEdit, onDelete }: ReviewItemProps) {
  return (
    <Item
      variant="outline"
      render={<article />}
      role="listitem"
      className="flex-col items-stretch gap-2 bg-card p-4"
    >
      <header className="flex items-center gap-2">
        <Avatar size="lg">
          <AvatarFallback>{review.author.initials}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{review.author.name}</span>
          <span className="text-xs text-muted-foreground">@{review.author.handle}</span>
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
      <div className="flex items-center gap-2">
        <RatingStars value={review.rating} size="sm" />
        <Badge variant="secondary" className="text-xs">
          {formatRelativeTime(review.createdAt)}
        </Badge>
      </div>
      <p className="text-sm whitespace-pre-line text-foreground">{review.content}</p>
    </Item>
  )
}
