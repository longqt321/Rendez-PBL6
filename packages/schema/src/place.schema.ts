import { z } from "zod"
import type {
  DailyPick,
  DailyPicks,
  Place,
  PlaceCategory,
  PlaceStatus,
  PlaceSuggestion,
  PlaceSummary,
} from "./types/place"

const placeCategorySchema = z.enum([
  "cafe",
  "restaurant",
  "street-food",
  "bakery",
  "dessert",
  "bar",
]) satisfies z.ZodType<PlaceCategory>

const placeStatusSchema = z.enum(["open", "closed", "unknown"]) satisfies z.ZodType<PlaceStatus>

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
  rating: z.number(),
  reviewCount: z.number(),
  priceLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  imageUrl: z.string().optional(),
  imageHeight: z.number(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  status: placeStatusSchema.optional(),
  openingHours: z.string().optional(),
  publishedAt: z.string().nullable(),
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
