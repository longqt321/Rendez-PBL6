import { useState } from "react"
import { PlusIcon, SendIcon, Trash2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { MAX_REVIEW_CONTENT_LENGTH } from "@/lib/constants"
import { formatNumber } from "@/lib/format"
import type { ReviewTier } from "@rendez/schema"
import type { Review } from "../types/review"
import { useUpsertReview } from "../hooks/use-upsert-review"
import { ReviewDeleteDialog } from "./review-delete-dialog"
import { REVIEW_TIER_META } from "../lib/review-tier-meta"

interface ReviewFormProps {
  placeId: string
  myReview: Review | null
  authorInitials: string
  suggestedDishes?: string[]
  onDone?: () => void
}

const TIER_ORDER: ReviewTier[] = ["must_try", "good", "ok", "not_for_me"]
const QUICK_TAG_OPTIONS = [
  "Đồ ăn ngon",
  "Giá hợp lý",
  "Không gian đẹp",
  "Phục vụ thân thiện",
  "Yên tĩnh",
  "Chỗ đậu xe rộng",
] as const

export function ReviewForm({
  placeId,
  myReview,
  authorInitials,
  suggestedDishes = [],
  onDone,
}: ReviewFormProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [tier, setTier] = useState<ReviewTier | null>(myReview?.tier ?? null)
  const [content, setContent] = useState(myReview?.content ?? "")
  const [dishes, setDishes] = useState<string[]>(myReview?.recommendedDishes ?? [])
  const [quickTags, setQuickTags] = useState<string[]>(myReview?.quickTags ?? [])
  const [dishDraft, setDishDraft] = useState("")
  const [imageUrls, setImageUrls] = useState<string[]>(myReview?.images ?? [])
  const [imageUrlDraft, setImageUrlDraft] = useState("")
  const upsert = useUpsertReview(placeId)

  function addImageUrl() {
    const clean = imageUrlDraft.trim()
    if (!clean) return
    if (imageUrls.length >= 5) {
      toast.info("Đính kèm tối đa 5 ảnh")
      return
    }
    setImageUrls((prev) => [...prev, clean])
    setImageUrlDraft("")
  }

  function removeImageUrl(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  function toggleQuickTag(tag: string) {
    setQuickTags((prev) =>
      prev.includes(tag)
        ? prev.filter((item) => item !== tag)
        : prev.length < 5
          ? [...prev, tag]
          : prev,
    )
  }

  function toggleDish(dishName: string) {
    const clean = dishName.trim()
    if (!clean) return
    const exists = dishes.some((d) => d.toLowerCase() === clean.toLowerCase())
    if (exists) {
      setDishes((prev) => prev.filter((d) => d.toLowerCase() !== clean.toLowerCase()))
      return
    }
    if (dishes.length >= 3) {
      toast.info("Chọn tối đa 3 món nên gọi")
      return
    }
    setDishes((prev) => [...prev, clean.slice(0, 40)])
  }

  function addCustomDish() {
    if (!dishDraft.trim()) return
    toggleDish(dishDraft)
    setDishDraft("")
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!tier) {
      toast.error("Hãy chọn mức đánh giá của bạn")
      return
    }
    upsert.mutate(
      {
        tier,
        content: content.trim(),
        recommendedDishes: dishes,
        quickTags,
        imageUrls,
      },
      {
        onSuccess: () => {
          toast.success(myReview ? "Đã cập nhật đánh giá" : "Đã gửi đánh giá, cảm ơn bạn!")
          onDone?.()
        },
        onError: () => toast.error("Không gửi được đánh giá, thử lại nhé"),
      },
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <Avatar size="lg" className="mt-1">
            <AvatarFallback>{authorInitials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col gap-2">
            <FieldLabel className="text-sm font-medium">
              {myReview ? "Đánh giá của bạn" : "Bạn thấy quán này thế nào?"}
            </FieldLabel>
            <ToggleGroup
              value={tier ? [tier] : []}
              onValueChange={(next) => {
                const selected = next[0] as ReviewTier | undefined
                if (selected) setTier(selected)
              }}
              variant="outline"
              className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4"
            >
              {TIER_ORDER.map((item) => {
                const meta = REVIEW_TIER_META[item]
                const Icon = meta.icon
                return (
                  <ToggleGroupItem
                    key={item}
                    value={item}
                    className="h-auto min-h-12 justify-start gap-2.5 px-3 py-2 text-left aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-semibold">{meta.label}</span>
                      <span className="text-xs font-normal opacity-80">{meta.hint}</span>
                    </div>
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </div>
        </div>

        {/* Progressive disclosure: chỉ mở phần món nên gọi & ghi chú khi đã chọn 1 mức */}
        {tier ? (
          <div className="flex flex-col gap-3 rounded-surface border border-border/60 bg-muted/30 p-3">
            <div className="flex flex-col gap-2">
              <FieldLabel className="text-xs font-medium text-muted-foreground">
                Món nên gọi (tối đa 3 món, tùy chọn)
              </FieldLabel>
              {suggestedDishes.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {suggestedDishes.map((dish) => {
                    const picked = dishes.some((d) => d.toLowerCase() === dish.toLowerCase())
                    return (
                      <Toggle
                        key={dish}
                        size="sm"
                        variant="outline"
                        pressed={picked}
                        onPressedChange={() => toggleDish(dish)}
                        className="h-8 rounded-full px-3 text-xs aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                      >
                        {dish}
                      </Toggle>
                    )
                  })}
                </div>
              ) : null}

              {dishes.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {dishes.map((dish) => (
                    <Badge key={dish} variant="secondary" className="gap-1 py-0.5 pr-1 pl-2.5">
                      <span>{dish}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => toggleDish(dish)}
                        aria-label={`Bỏ món ${dish}`}
                        className="size-5 rounded-full"
                      >
                        <XIcon className="size-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              ) : null}

              <div className="flex gap-2">
                <Input
                  value={dishDraft}
                  onChange={(e) => setDishDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addCustomDish()
                    }
                  }}
                  placeholder="Thêm món bạn thích (vd: Mì quảng ếch)..."
                  maxLength={40}
                  disabled={dishes.length >= 3}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomDish}
                  disabled={!dishDraft.trim() || dishes.length >= 3}
                >
                  <PlusIcon className="size-4" />
                  Thêm
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel className="text-xs font-medium text-muted-foreground">
                Điểm nổi bật (tối đa 5 thẻ, tùy chọn)
              </FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TAG_OPTIONS.map((tag) => (
                  <Toggle
                    key={tag}
                    size="sm"
                    variant="outline"
                    pressed={quickTags.includes(tag)}
                    onPressedChange={() => toggleQuickTag(tag)}
                    className="h-7 rounded-full px-2.5 text-xs aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                  >
                    {tag}
                  </Toggle>
                ))}
              </div>
            </div>

            <Field>
              <FieldLabel htmlFor="review-content" className="sr-only">
                Nhận xét thêm (tùy chọn)
              </FieldLabel>
              <Textarea
                id="review-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhận xét thêm về món ăn, không gian, phục vụ (không bắt buộc)..."
                className="min-h-20 bg-background"
                maxLength={MAX_REVIEW_CONTENT_LENGTH}
              />
              <FieldDescription>
                {formatNumber(content.length)}/{formatNumber(MAX_REVIEW_CONTENT_LENGTH)}
              </FieldDescription>
            </Field>

            <div className="flex flex-col gap-1.5">
              <FieldLabel className="text-xs font-medium text-muted-foreground">
                Ảnh chụp tại quán (tối đa 5 ảnh, tùy chọn)
              </FieldLabel>
              {imageUrls.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {imageUrls.map((url, idx) => (
                    <div
                      key={url}
                      className="relative size-14 overflow-hidden rounded-control border border-border"
                    >
                      <img src={url} alt="Ảnh đánh giá" className="size-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-xs"
                        className="absolute top-0.5 right-0.5 size-4 rounded-full p-0"
                        onClick={() => removeImageUrl(idx)}
                        aria-label="Xoá ảnh"
                      >
                        <XIcon className="size-2.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
              {imageUrls.length < 5 ? (
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={imageUrlDraft}
                    onChange={(e) => setImageUrlDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addImageUrl()
                      }
                    }}
                    placeholder="Dán link ảnh (https://...)..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addImageUrl}
                    disabled={!imageUrlDraft.trim()}
                  >
                    <PlusIcon className="size-4" />
                    Thêm ảnh
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
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
          <Button type="submit" disabled={!tier || upsert.isPending} className="min-h-11">
            {upsert.isPending ? <Spinner aria-label="Đang gửi đánh giá" /> : <SendIcon />}
            {myReview ? "Cập nhật" : "Gửi đánh giá"}
          </Button>
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
