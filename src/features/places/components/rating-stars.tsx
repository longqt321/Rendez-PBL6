import { StarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface RatingStarsProps {
  value: number
  /** Khi có `onChange`, component thành nút chọn sao; không có thì chỉ hiển thị. */
  onChange?: (value: number) => void
  size?: "sm" | "md"
  className?: string
}

/**
 * Hàng 5 sao dùng chung cho hiển thị và nhập điểm đánh giá (1–5, chênh nửa sao
 * không hỗ trợ — form chỉ nhận số nguyên).
 */
export function RatingStars({ value, onChange, size = "md", className }: RatingStarsProps) {
  const interactive = typeof onChange === "function"
  const sizeClass = size === "sm" ? "size-4" : "size-6"

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role={interactive ? "radiogroup" : "img"}
      aria-label={interactive ? "Chọn số sao đánh giá, từ 1 đến 5" : `Đánh giá ${value} trên 5 sao`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value
        const starNode = (
          <StarIcon
            className={cn(sizeClass, filled ? "fill-star text-star" : "text-muted-foreground/40")}
            aria-hidden="true"
          />
        )
        if (!interactive) return <span key={star}>{starNode}</span>
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} sao`}
            className="cursor-pointer rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onChange?.(star)}
          >
            {starNode}
          </button>
        )
      })}
    </div>
  )
}
