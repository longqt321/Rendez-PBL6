import { placeSummarySchema } from "./place.schema"
import { z } from "zod"
import type { Author, Post } from "./types/post"

export const authorSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  initials: z.string(),
}) satisfies z.ZodType<Author>

export const postSchema = z.object({
  id: z.string(),
  author: authorSchema,
  caption: z.string(),
  pinnedAt: z.string().nullable(),
  createdAt: z.string(),
  placeId: z.string().nullable(),
  place: placeSummarySchema.nullable(),
  likeCount: z.number(),
  commentCount: z.number(),
  likedByMe: z.boolean(),
  savedByMe: z.boolean(),
  images: z.array(z.string()),
}) satisfies z.ZodType<Post>

export const updatePostInputSchema = z
  .object({
    caption: z.string().trim().min(1).max(2000).optional(),
    pinned: z.boolean().optional(),
  })
  .refine((v) => v.caption !== undefined || v.pinned !== undefined, {
    message: "Cần cung cấp nội dung hoặc trạng thái ghim",
  })
