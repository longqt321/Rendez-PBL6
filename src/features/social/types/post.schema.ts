import { placeSummarySchema } from "@/features/places/types/place.schema"
import { z } from "zod"
import type { Author, Post } from "./post"

/** Người đăng rút gọn — khớp `Author`. */
export const authorSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  initials: z.string(),
}) satisfies z.ZodType<Author>

/** Bài đăng trong feed — khớp `Post`. */
export const postSchema = z.object({
  id: z.string(),
  author: authorSchema,
  caption: z.string(),
  imageSeed: z.string(),
  imageHeight: z.number(),
  createdAt: z.string(),
  placeId: z.string().nullable(),
  place: placeSummarySchema.nullable(),
  likeCount: z.number(),
  commentCount: z.number(),
  likedByMe: z.boolean(),
  savedByMe: z.boolean(),
}) satisfies z.ZodType<Post>
