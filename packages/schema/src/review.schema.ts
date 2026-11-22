import { authorSchema } from "./post.schema"
import { recommendedDishCountSchema, reviewTierSummarySchema } from "./place.schema"
import { z } from "zod"
import type { Review, ReviewTier } from "./types/review"

export { recommendedDishCountSchema, reviewTierSummarySchema }

export const reviewTierSchema = z.enum(["ok", "good", "must_try"]) satisfies z.ZodType<ReviewTier>

export const reviewSchema = z.object({
  id: z.string(),
  placeId: z.string(),
  author: authorSchema,
  tier: reviewTierSchema,
  content: z.string(),
  recommendedDishes: z.array(z.string()),
  quickTags: z.array(z.string()),
  authorReviewCount: z.number().int().min(0).optional(),
  isFollowingAuthor: z.boolean().optional(),
  createdAt: z.string(),
  isMine: z.boolean(),
}) satisfies z.ZodType<Review>

export const upsertReviewInputSchema = z.object({
  tier: reviewTierSchema,
  content: z.string().trim().max(1000).optional().default(""),
  recommendedDishes: z.array(z.string().trim().min(1).max(40)).max(3).optional().default([]),
  quickTags: z.array(z.string().trim().min(1).max(40)).max(3).optional().default([]),
})

export type UpsertReviewInput = z.infer<typeof upsertReviewInputSchema>
