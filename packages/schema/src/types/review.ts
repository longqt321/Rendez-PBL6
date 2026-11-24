import type { Author } from "./post"

export type ReviewTier = "not_for_me" | "ok" | "good" | "must_try"

export interface Review {
  id: string
  placeId: string
  author: Author
  tier: ReviewTier
  content: string
  recommendedDishes: string[]
  quickTags: string[]
  images?: string[]
  helpfulCount?: number
  helpfulByMe?: boolean
  authorReviewCount?: number
  isFollowingAuthor?: boolean
  createdAt: string

  isMine: boolean
}

export interface ReviewTierSummary {
  notForMeCount?: number
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
