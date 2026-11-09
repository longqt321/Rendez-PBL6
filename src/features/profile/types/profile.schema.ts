import { z } from "zod"
import type { UserProfile } from "./profile"

/** Hồ sơ người dùng — khớp `UserProfile` (hợp đồng của `GET /me`, `GET /users/:handle`). */
export const userProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  initials: z.string(),
  bio: z.string(),
  location: z.string(),
  joinedAt: z.string(),
  postCount: z.number(),
  followerCount: z.number(),
  followingCount: z.number(),
  followedByMe: z.boolean(),
  isMe: z.boolean(),
}) satisfies z.ZodType<UserProfile>
