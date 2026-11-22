import { CheckIcon, FlameIcon, ThumbsUpIcon } from "lucide-react"
import type { ReviewTier } from "@rendez/schema"

export const REVIEW_TIER_META: Record<
  ReviewTier,
  {
    label: string
    hint: string
    icon: typeof FlameIcon
    badgeClass: string
  }
> = {
  must_try: {
    label: "Phải thử",
    hint: "Xuất sắc, rất đáng đi",
    icon: FlameIcon,
    badgeClass: "border-star/45 bg-star/15 text-foreground",
  },
  good: {
    label: "Rất ngon",
    hint: "Hài lòng, sẽ quay lại",
    icon: ThumbsUpIcon,
    badgeClass: "border-open/40 bg-open/15 text-open",
  },
  ok: {
    label: "Ổn",
    hint: "Ăn được, vừa tầm",
    icon: CheckIcon,
    badgeClass: "border-border bg-secondary text-secondary-foreground",
  },
}

/**
 * Nhãn tóm tắt độ tin cậy tối giản, chống ảo giác mẫu nhỏ:
 * - Dưới 5 đánh giá: chỉ hiện tổng số lượt đánh giá, không hiện %.
 * - Từ 5 đánh giá trở lên: hiện thẳng tỷ lệ Phải thử / Tổng đánh giá.
 */
export function formatPlaceTrustLabel(
  mustTryCount: number | undefined,
  reviewCount: number,
): string | null {
  if (reviewCount <= 0) return null
  if (reviewCount < 5) return `${reviewCount} đánh giá`
  return `${mustTryCount ?? 0}/${reviewCount} Phải thử`
}
