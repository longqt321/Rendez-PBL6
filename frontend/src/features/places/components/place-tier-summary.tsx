import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Toggle } from "@/components/ui/toggle"
import type { RecommendedDishCount, Review, ReviewTier, ReviewTierSummary } from "@rendez/schema"
import { REVIEW_TIER_META } from "../lib/review-tier-meta"

interface PlaceTierSummaryProps {
  summary?: ReviewTierSummary
  topDishes?: RecommendedDishCount[]
  reviews?: Review[]
  selectedTier: ReviewTier | null
  onSelectTier: (tier: ReviewTier | null) => void
}

function computeFromReviews(reviews: Review[]): {
  summary: ReviewTierSummary
  topDishes: RecommendedDishCount[]
} {
  const mustTryCount = reviews.filter((r) => r.tier === "must_try").length
  const goodCount = reviews.filter((r) => r.tier === "good").length
  const okCount = reviews.filter((r) => r.tier === "ok").length
  const notForMeCount = reviews.filter((r) => r.tier === "not_for_me").length
  const totalReviews = reviews.length
  const positiveRatio =
    totalReviews > 0 ? Math.round((100 * (mustTryCount + goodCount)) / totalReviews) : 0

  const dishCounts = new Map<string, { dishName: string; count: number }>()
  for (const r of reviews) {
    for (const raw of r.recommendedDishes) {
      const clean = raw.trim()
      const key = clean.toLowerCase()
      if (!clean) continue
      const cur = dishCounts.get(key)
      if (cur) cur.count += 1
      else dishCounts.set(key, { dishName: clean, count: 1 })
    }
  }
  const topDishes = [...dishCounts.values()]
    .sort((a, b) => b.count - a.count || a.dishName.localeCompare(b.dishName))
    .slice(0, 5)

  return {
    summary: { mustTryCount, goodCount, okCount, notForMeCount, totalReviews, positiveRatio },
    topDishes,
  }
}

export function PlaceTierSummary({
  summary,
  topDishes,
  reviews = [],
  selectedTier,
  onSelectTier,
}: PlaceTierSummaryProps) {
  const computed = computeFromReviews(reviews)
  const effectiveSummary = summary ?? computed.summary
  const effectiveDishes = topDishes && topDishes.length > 0 ? topDishes : computed.topDishes
  const total = effectiveSummary.totalReviews
  const notForMeCount = reviews.filter((r) => r.tier === "not_for_me").length
  const rows: Array<{ tier: ReviewTier; count: number }> = [
    { tier: "must_try", count: effectiveSummary.mustTryCount },
    { tier: "good", count: effectiveSummary.goodCount },
    { tier: "ok", count: effectiveSummary.okCount },
    { tier: "not_for_me", count: effectiveSummary.notForMeCount ?? notForMeCount },
  ]

  const followedNames = [
    ...new Set(reviews.filter((r) => r.isFollowingAuthor && !r.isMine).map((r) => r.author.name)),
  ]

  let summaryHeading = "Chưa có đánh giá nào"
  if (total > 0) {
    if (followedNames.length > 0) {
      const lead = followedNames.slice(0, 2).join(", ")
      const others = total - Math.min(followedNames.length, 2)
      summaryHeading =
        others > 0 ? `${lead} & ${others} người khác đã đánh giá` : `${lead} đã đánh giá`
    } else {
      summaryHeading = `${total} người đã đánh giá`
    }
  }

  return (
    <Card className="border-border/60 py-0 shadow-(--shadow-soft)">
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">{summaryHeading}</span>
          {selectedTier ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onSelectTier(null)}>
              Hiện tất cả
            </Button>
          ) : null}
        </div>

        {total > 0 ? (
          <div className="flex flex-col gap-1.5">
            {rows.map(({ tier, count }) => {
              const meta = REVIEW_TIER_META[tier]
              const Icon = meta.icon
              const pct = Math.round((100 * count) / total)
              const active = selectedTier === tier
              return (
                <Toggle
                  key={tier}
                  pressed={active}
                  onPressedChange={(next) => onSelectTier(next ? tier : null)}
                  className="h-9 w-full justify-start gap-2.5 px-2 aria-pressed:bg-secondary"
                >
                  <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="w-20 text-left text-xs font-medium">{meta.label}</span>
                  <Progress value={pct} className="h-2 flex-1" />
                  <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                    {count}
                  </span>
                </Toggle>
              )
            })}
          </div>
        ) : null}

        {effectiveDishes.length > 0 ? (
          <div className="flex flex-col gap-1.5 border-t border-border/50 pt-3">
            <span className="text-xs font-semibold text-muted-foreground">Món nên gọi</span>
            <div className="flex flex-wrap gap-1.5">
              {effectiveDishes.map((dish) => (
                <Badge key={dish.dishName} variant="secondary" className="gap-1.5 font-normal">
                  <span>{dish.dishName}</span>
                  <span className="text-xs font-semibold text-primary tabular-nums">
                    {dish.count}
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
