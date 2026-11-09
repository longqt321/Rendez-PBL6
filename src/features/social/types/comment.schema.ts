import { authorSchema } from "./post.schema"
import { z } from "zod"
import type { Comment } from "./comment"

/** Bình luận của một bài đăng — khớp `Comment`. */
export const commentSchema = z.object({
  id: z.string(),
  postId: z.string(),
  author: authorSchema,
  body: z.string(),
  createdAt: z.string(),
  likeCount: z.number(),
  likedByMe: z.boolean(),
  isMine: z.boolean(),
  parentId: z.string().nullable(),
  replyTo: z.object({ commentId: z.string(), handle: z.string() }).nullable(),
}) satisfies z.ZodType<Comment>
