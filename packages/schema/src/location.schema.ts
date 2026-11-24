import { z } from "zod"

export const anchorKindSchema = z.enum(["home", "work", "school", "custom"])
export type AnchorKind = z.infer<typeof anchorKindSchema>

export const userLocationAnchorSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(60),
  kind: anchorKindSchema,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().max(200).nullable(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type UserLocationAnchor = z.infer<typeof userLocationAnchorSchema>

export const createAnchorInputSchema = z.object({
  label: z.string().trim().min(1, "Vui lòng nhập tên mốc").max(60, "Tên mốc tối đa 60 ký tự"),
  kind: anchorKindSchema.default("custom"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().trim().max(200).nullable().optional(),
  isDefault: z.boolean().optional().default(false),
})
export type CreateAnchorInput = z.infer<typeof createAnchorInputSchema>

export const updateAnchorInputSchema = z.object({
  label: z.string().trim().min(1, "Vui lòng nhập tên mốc").max(60, "Tên mốc tối đa 60 ký tự").optional(),
  kind: anchorKindSchema.optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  address: z.string().trim().max(200).nullable().optional(),
  isDefault: z.boolean().optional(),
})
export type UpdateAnchorInput = z.infer<typeof updateAnchorInputSchema>

export const cityLandmarkSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  district: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
  sortOrder: z.number().int(),
})
export type CityLandmark = z.infer<typeof cityLandmarkSchema>

export const syncedLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().positive(),
  updatedAt: z.string(),
})
export type SyncedLocation = z.infer<typeof syncedLocationSchema>

export const upsertSyncedLocationInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().positive().max(5000, "Độ chính xác GPS chưa đủ tốt (<= 5000m)"),
})
export type UpsertSyncedLocationInput = z.infer<typeof upsertSyncedLocationInputSchema>
