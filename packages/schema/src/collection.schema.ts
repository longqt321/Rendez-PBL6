import { z } from "zod"
import type { Collection, CollectionSummary } from "./types/collection"

export const collectionSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  isPrivate: z.boolean(),
  placeCount: z.number(),
  previewPlaceIds: z.array(z.string()),
  createdAt: z.string(),
  containsPlace: z.boolean().optional(),
  likeCount: z.number(),
  likedByMe: z.boolean(),
}) satisfies z.ZodType<CollectionSummary>

export const collectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  isPrivate: z.boolean(),
  owner: z.object({
    id: z.string(),
    name: z.string(),
    handle: z.string(),
    initials: z.string(),
  }),
  placeIds: z.array(z.string()),
  createdAt: z.string(),
  isMine: z.boolean(),
  likeCount: z.number(),
  likedByMe: z.boolean(),
}) satisfies z.ZodType<Collection>

export const reorderCollectionPlacesSchema = z.object({
  placeIds: z.array(z.string().trim().min(1)).min(1).max(200),
})
