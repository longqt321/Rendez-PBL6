import { authorSchema } from "./post.schema"
import { z } from "zod"
import type { Review } from "./types/review"

/** Đánh giá của người dùng cho một địa điểm — khớp `Review`. */
export const reviewSchema = z.object({
  id: z.string(),
  placeId: z.string(),
  author: authorSchema,
  rating: z.number(),
  content: z.string(),
  createdAt: z.string(),
  isMine: z.boolean(),
}) satisfies z.ZodType<Review>
