import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { SendIcon, Trash2Icon } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { MAX_REVIEW_CONTENT_LENGTH } from "@/lib/constants"
import { formatNumber } from "@/lib/format"
import type { Review } from "../types/review"
import { useUpsertReview } from "../hooks/use-upsert-review"
import { RatingStars } from "./rating-stars"
import { ReviewDeleteDialog } from "./review-delete-dialog"

interface ReviewFormProps {
  placeId: string
  /** Đánh giá hiện có của người dùng (nếu đã đánh giá) — có thì form ở chế độ sửa. */
  myReview: Review | null
  authorInitials: string
  onDone?: () => void
}

const reviewSchema = z.object({
  rating: z.number().int().min(1, "Chọn số sao đánh giá").max(5),
  content: z
    .string()
    .trim()
    .min(1, "Nhập nội dung đánh giá")
    .max(
      MAX_REVIEW_CONTENT_LENGTH,
      `Nội dung tối đa ${formatNumber(MAX_REVIEW_CONTENT_LENGTH)} ký tự`,
    ),
})

type ReviewFormValues = z.infer<typeof reviewSchema>

/**
 * Form viết/ghi đè đánh giá: chỉ chọn sao 1–5 và gõ text.
 *
 * Không có ô upload ảnh hay file — đúng thiết kế, server cũng từ chối trường đính
 * kèm. Gửi lại đánh giá đã có là ghi đè (một người một đánh giá mỗi địa điểm).
 */
export function ReviewForm({ placeId, myReview, authorInitials, onDone }: ReviewFormProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: myReview?.rating ?? 0,
      content: myReview?.content ?? "",
    },
  })
  const upsert = useUpsertReview(placeId)
  const content = useWatch({ control: form.control, name: "content" })

  function onSubmit(values: ReviewFormValues) {
    upsert.mutate(values, {
      onSuccess: (review) => {
        toast.success(myReview ? "Đã cập nhật đánh giá" : "Đã gửi đánh giá, cảm ơn bạn!")
        onDone?.()
        void review
      },
      onError: () => toast.error("Không gửi được đánh giá, thử lại nhé"),
    })
  }

  return (
    <>
      <form
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        className="flex flex-col gap-3"
      >
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            <AvatarFallback>{authorInitials}</AvatarFallback>
          </Avatar>
          <Field data-invalid={!!form.formState.errors.rating}>
            <FieldLabel className="text-sm font-medium">
              {myReview ? "Đánh giá của bạn" : "Chia sẻ trải nghiệm của bạn"}
            </FieldLabel>
            <Controller
              control={form.control}
              name="rating"
              render={({ field }) => <RatingStars value={field.value} onChange={field.onChange} />}
            />
            <FieldError errors={[form.formState.errors.rating]} />
          </Field>
        </div>
        <Field data-invalid={!!form.formState.errors.content}>
          <FieldLabel htmlFor="review-content" className="sr-only">
            Nội dung đánh giá
          </FieldLabel>
          <Textarea
            id="review-content"
            {...form.register("content")}
            aria-invalid={!!form.formState.errors.content}
            placeholder="Vị ngon, không gian, giá cả… chỉ bằng chữ thôi (không đính kèm ảnh hoặc file)"
            className="min-h-24"
            maxLength={MAX_REVIEW_CONTENT_LENGTH}
          />
          <FieldError errors={[form.formState.errors.content]} />
        </Field>
        <div className="flex items-center justify-between gap-2">
          <FieldDescription>
            {formatNumber(content.length)}/{formatNumber(MAX_REVIEW_CONTENT_LENGTH)}
          </FieldDescription>
          <div className="flex items-center gap-2">
            {myReview ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={upsert.isPending}
              >
                <Trash2Icon />
                Xoá đánh giá
              </Button>
            ) : null}
            {onDone ? (
              <Button type="button" variant="ghost" onClick={onDone} disabled={upsert.isPending}>
                Huỷ
              </Button>
            ) : null}
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending ? <Spinner aria-label="Đang lưu đánh giá" /> : <SendIcon />}
              {myReview ? "Cập nhật" : "Gửi đánh giá"}
            </Button>
          </div>
        </div>
      </form>

      {myReview ? (
        <ReviewDeleteDialog
          placeId={placeId}
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onDeleted={onDone}
        />
      ) : null}
    </>
  )
}
