import { z } from "zod"
import {
  MAX_PROFILE_BIO_LENGTH,
  MAX_PROFILE_LOCATION_LENGTH,
  MAX_PROFILE_NAME_LENGTH,
} from "./constants"
import type { UserProfile } from "./types/profile"

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
  privateProfile: z.boolean(),
}) satisfies z.ZodType<UserProfile>

/**
 * Body của `PATCH /me` — chỉ các trường người dùng tự sửa được.
 *
 * Giới hạn ký tự dùng chung với form ở `/settings` (`constants`), nên client
 * và server không thể lệch nhau.
 */
export const updateMeInputSchema = z.object({
  name: z.string().min(2).max(MAX_PROFILE_NAME_LENGTH),
  bio: z.string().max(MAX_PROFILE_BIO_LENGTH),
  location: z.string().max(MAX_PROFILE_LOCATION_LENGTH),
  privateProfile: z.boolean(),
})

export type UpdateMeInput = z.infer<typeof updateMeInputSchema>
