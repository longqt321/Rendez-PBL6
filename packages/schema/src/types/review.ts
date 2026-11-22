import type { Author } from "./post"

export type ReviewTier = "ok" | "good" | "must_try"

export interface Review {
  id: string
  placeId: string
  author: Author
  tier: ReviewTier
  content: string
  recommendedDishes: string[]
  quickTags: string[]
  authorReviewCount?: number
  isFollowingAuthor?: boolean
  createdAt: string

  isMine: boolean
}

export interface ReviewTierSummary {
  mustTryCount: number
  goodCount: number
  okCount: number
  totalReviews: number
  positiveRatio: number
}

export interface RecommendedDishCount {
  dishName: string
  count: number
}
