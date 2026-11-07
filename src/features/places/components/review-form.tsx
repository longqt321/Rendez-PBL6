import { useState } from "react"
import { SendIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Review } from "../types/review"
import { useUpsertReview } from "../hooks/use-upsert-review"
import { RatingStars } from "./rating-stars"

interface ReviewFormProps {
  placeId: string
  /** Đánh giá hiện có của người dùng (nếu đã đánh giá) — có thì form ở chế độ sửa. */
  myReview: Review | null
  authorInitials: string
  onDone?: () => void
}

/** Giới hạn nội dung text — khớp phía server (tối đa 1000 ký tự). */
const MAX_CONTENT_LENGTH = 1000

/**
 * Form viết/ghi đè đánh giá: chỉ chọn sao 1–5 và gõ text.
 *
 * Không có ô upload ảnh hay file — đúng thiết kế, server cũng từ chối trường đính
 * kèm. Gửi lại đánh giá đã có là ghi đè (một người một đánh giá mỗi địa điểm).
 */
export function ReviewForm({ placeId, myReview, authorInitials, onDone }: ReviewFormProps) {
  const [rating, setRating] = useState(myReview?.rating ?? 0)
  const [content, setContent] = useState(myReview?.content ?? "")
  const upsert = useUpsertReview(placeId)
  const trimmed = content.trim()
  const canSubmit = rating >= 1 && trimmed.length > 0 && !upsert.isPending

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    upsert.mutate(
      { rating, content: trimmed },
      {
        onSuccess: (review) => {
          toast.success(myReview ? "Đã cập nhật đánh giá" : "Đã gửi đánh giá, cảm ơn bạn!")
          onDone?.()
          void review
        },
        onError: () => toast.error("Không gửi được đánh giá, thử lại nhé"),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          <AvatarFallback>{authorInitials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            {myReview ? "Đánh giá của bạn" : "Chia sẻ trải nghiệm của bạn"}
          </span>
          <RatingStars value={rating} onChange={setRating} />
        </div>
      </div>
      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value.slice(0, MAX_CONTENT_LENGTH))}
        placeholder="Vị ngon, không gian, giá cả… chỉ bằng chữ thôi (không đính kèm ảnh hoặc file)"
        className="min-h-24"
        maxLength={MAX_CONTENT_LENGTH}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {content.length}/{MAX_CONTENT_LENGTH}
        </span>
        <div className="flex items-center gap-2">
          {onDone ? (
            <Button type="button" variant="ghost" onClick={onDone} disabled={upsert.isPending}>
              Huỷ
            </Button>
          ) : null}
          <Button type="submit" disabled={!canSubmit}>
            {upsert.isPending ? <Spinner /> : <SendIcon />}
            {myReview ? "Cập nhật" : "Gửi đánh giá"}
          </Button>
        </div>
      </div>
    </form>
  )
}
