import { z } from "zod"
import type { PlaceSubmission, SubmissionStatus } from "./types/submission"

const submissionStatusSchema = z.enum(["pending", "reviewed", "dismissed"]) satisfies z.ZodType<SubmissionStatus>

const placeCategorySchema = z.enum([
  "cafe",
  "restaurant",
  "street-food",
  "bakery",
  "dessert",
  "bar",
])

export const createPlaceSubmissionInputSchema = z.object({
  name: z.string().trim().min(2, "Tên địa điểm cần ít nhất 2 ký tự").max(120),
  address: z.string().trim().min(3, "Địa chỉ cần ít nhất 3 ký tự").max(255),
  city: z.string().trim(),
  district: z.string().trim().optional(),
  category: placeCategorySchema,
  priceLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  openingHours: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  description: z.string().trim().max(1000).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  imageUrls: z.array(z.string().url()).max(5).optional(),
})

export type CreatePlaceSubmissionInput = z.infer<typeof createPlaceSubmissionInputSchema>

export const reviewPlaceSubmissionInputSchema = z.object({
  status: z.enum(["reviewed", "dismissed"]),
  reviewNote: z.string().trim().max(500).optional(),
})

export type ReviewPlaceSubmissionInput = z.infer<typeof reviewPlaceSubmissionInputSchema>

export const placeSubmissionSchema = z.object({
  id: z.string(),
  submitterId: z.string(),
  submitterName: z.string().optional(),
  name: z.string(),
  address: z.string(),
  city: z.string(),
  district: z.string().optional(),
  category: placeCategorySchema,
  priceLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  openingHours: z.string().optional(),
  phone: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()),
  imageUrls: z.array(z.string()),
  status: submissionStatusSchema,
  reviewerId: z.string().optional(),
  reviewNote: z.string().optional(),
  createdPlaceId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}) satisfies z.ZodType<PlaceSubmission>
