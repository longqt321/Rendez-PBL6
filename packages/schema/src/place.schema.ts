import { z } from "zod"
import type {
  DailyPick,
  DailyPicks,
  Place,
  PlaceCategory,
  PlaceMediaItem,
  PlaceMediaKind,
  PlaceStatus,
  PlaceSuggestion,
  PlaceSummary,
} from "./types/place"
import type { RecommendedDishCount, ReviewTierSummary } from "./types/review"

export const reviewTierSummarySchema = z.object({
  mustTryCount: z.number().int().min(0),
  goodCount: z.number().int().min(0),
  okCount: z.number().int().min(0),
  totalReviews: z.number().int().min(0),
  positiveRatio: z.number().int().min(0).max(100),
}) satisfies z.ZodType<ReviewTierSummary>

export const recommendedDishCountSchema = z.object({
  dishName: z.string(),
  count: z.number().int().min(1),
}) satisfies z.ZodType<RecommendedDishCount>

const placeCategorySchema = z.enum([
  "cafe",
  "restaurant",
  "street-food",
  "bakery",
  "dessert",
  "bar",
]) satisfies z.ZodType<PlaceCategory>

const placeStatusSchema = z.enum(["open", "closed", "unknown"]) satisfies z.ZodType<PlaceStatus>

export const placeMediaKindSchema = z.enum([
  "venue",
  "dish_real",
  "menu_price",
]) satisfies z.ZodType<PlaceMediaKind>

export const placeMediaItemSchema = z.object({
  id: z.string(),
  url: z.string(),
  kind: placeMediaKindSchema,
  capturedAt: z.string(),
  sourceType: z.enum(["place", "post"]),
  authorName: z.string().optional(),
  postId: z.string().optional(),
}) satisfies z.ZodType<PlaceMediaItem>

export const addPlaceImagesInputSchema = z.object({
  images: z
    .array(
      z.object({
        url: z.string().trim().min(1),
        kind: z.enum(["dish_real", "menu_price", "venue"]),
      }),
    )
    .min(1)
    .max(3),
})

export const placeSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  district: z.string().optional(),
  category: placeCategorySchema,
  imageUrl: z.string().optional(),
  isPublished: z.boolean(),
  lat: z.number().optional(),
  lng: z.number().optional(),
}) satisfies z.ZodType<PlaceSummary>

export const placeSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  city: z.string(),
  district: z.string().optional(),
  category: placeCategorySchema,
  tags: z.array(z.string()),
  positiveRatio: z.number().int().min(0).max(100),
  mustTryCount: z.number().int().min(0).optional(),
  reviewCount: z.number(),
  tierSummary: reviewTierSummarySchema.optional(),
  topRecommendedDishes: z.array(recommendedDishCountSchema).optional(),
  priceLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
  imageUrl: z.string().optional(),
  imageHeight: z.number(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  status: placeStatusSchema.optional(),
  openingHours: z.string().optional(),
  phone: z.string().optional(),
  publishedAt: z.string().nullable(),
  note: z.string().nullable().optional(),
}) satisfies z.ZodType<Place>

export const placeSuggestionSchema = z.object({
  place: placeSummarySchema,
  reason: z.string(),
}) satisfies z.ZodType<PlaceSuggestion>

export const dailyPickWhySchema = z.object({
  matchPercent: z.number().int().min(0).max(100),
  district: z.string().optional(),
  distanceKm: z.number().nullable(),
  openNow: z.boolean().nullable(),
  signals: z.array(z.string()).max(3),
})

export const dailyPickSchema = z.object({
  place: placeSchema,
  reason: z.string(),
  why: dailyPickWhySchema.optional(),
}) satisfies z.ZodType<DailyPick>

export const dailyPicksSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  items: z.array(dailyPickSchema).max(3),
}) satisfies z.ZodType<DailyPicks>
