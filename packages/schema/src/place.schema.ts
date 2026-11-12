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

/** Schema khớp `PlaceCategory` — enum đóng, server quyết định. */
const placeCategorySchema = z.enum([
  "cafe",
  "restaurant",
  "street-food",
  "bakery",
  "dessert",
  "bar",
]) satisfies z.ZodType<PlaceCategory>

/** Schema khớp `PlaceStatus` — thiếu/không rõ thì server không gửi trường này. */
const placeStatusSchema = z.enum(["open", "closed", "unknown"]) satisfies z.ZodType<PlaceStatus>

/** Bản rút gọn server nhúng vào bài đăng và đề xuất — khớp `PlaceSummary`. */
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

/** Địa điểm đầy đủ dùng cho lưới /discover — khớp `Place`. */
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
}) satisfies z.ZodType<Place>

/** Đề xuất địa điểm do server xếp hạng — khớp `PlaceSuggestion`. */
export const placeSuggestionSchema = z.object({
  place: placeSummarySchema,
  reason: z.string(),
}) satisfies z.ZodType<PlaceSuggestion>

/** Một quán trong "Gợi ý hôm nay" — dùng `placeSchema` đầy đủ để FE render `PlaceCard`. */
export const dailyPickSchema = z.object({
  place: placeSchema,
  reason: z.string(),
}) satisfies z.ZodType<DailyPick>

/** Payload `GET /places/daily-picks`; `items` rỗng khi job chưa chạy (không phải lỗi). */
export const dailyPicksSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  items: z.array(dailyPickSchema).max(3),
}) satisfies z.ZodType<DailyPicks>
