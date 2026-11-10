import { z } from "zod"
import type { Collection, CollectionSummary } from "./collection"

/** Bản rút gọn khi liệt kê bộ sưu tập — khớp `CollectionSummary`. */
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

/** Bộ sưu tập đầy đủ — khớp `Collection`. */
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
