import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ReviewTier } from "@rendez/schema"
import { REVIEW_TIER_META } from "../lib/review-tier-meta"

interface ReviewTierBadgeProps {
  tier: ReviewTier
  className?: string
}

export function ReviewTierBadge({ tier, className }: ReviewTierBadgeProps) {
  const meta = REVIEW_TIER_META[tier]
  const Icon = meta.icon
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", meta.badgeClass, className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      <span>{meta.label}</span>
    </Badge>
  )
}
