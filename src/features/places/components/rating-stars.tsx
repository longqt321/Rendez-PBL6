import { StarIcon } from "lucide-react"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

interface RatingStarsProps {
  value: number
  /** Khi có `onChange`, component thành nút chọn sao; không có thì chỉ hiển thị. */
  onChange?: (value: number) => void
  size?: "sm" | "md"
  className?: string
}

const STARS = [1, 2, 3, 4, 5]

/**
 * Hàng 5 sao dùng chung cho hiển thị và nhập điểm đánh giá (1–5, chênh nửa sao
 * không hỗ trợ — form chỉ nhận số nguyên).
 */
export function RatingStars({ value, onChange, size = "md", className }: RatingStarsProps) {
  const interactive = typeof onChange === "function"
  const sizeClass = size === "sm" ? "size-4" : "size-6"

  if (!interactive) {
    return (
      <div
        className={cn("flex items-center gap-0.5", className)}
        role="img"
        aria-label={`Đánh giá ${value} trên 5 sao`}
      >
        {STARS.map((star) => (
          <span key={star}>
            <StarIcon
              className={cn(
                sizeClass,
                star <= value ? "fill-star text-star" : "text-muted-foreground/40",
              )}
              aria-hidden="true"
            />
          </span>
        ))}
      </div>
    )
  }

  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onChange?.(next)}
      aria-label="Chọn số sao đánh giá, từ 1 đến 5"
      className={cn("w-auto flex-row items-center gap-0.5", className)}
    >
      {STARS.map((star) => (
        <Label
          key={star}
          className="cursor-pointer rounded-sm outline-none has-data-checked:text-star has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
        >
          {/* Nút radio thật bị ẩn; Label bọc ngoài vẫn bấm được vào ngôi sao. */}
          <RadioGroupItem value={star} aria-label={`${star} sao`} className="sr-only" />
          <StarIcon
            className={cn(
              sizeClass,
              star <= value ? "fill-star text-star" : "text-muted-foreground/40",
            )}
            aria-hidden="true"
          />
        </Label>
      ))}
    </RadioGroup>
  )
}
