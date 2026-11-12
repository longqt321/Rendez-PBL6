import { z } from "zod"
import {
  MAX_PROFILE_BIO_LENGTH,
  MAX_PROFILE_LOCATION_LENGTH,
  MAX_PROFILE_NAME_LENGTH,
} from "./constants"
import { MAX_POST_IMAGE_URL_LENGTH } from "./post-images"
import type { UserProfile } from "./types/profile"

/** Hồ sơ người dùng — khớp `UserProfile` (hợp đồng của `GET /me`, `GET /users/:handle`). */
export const userProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  initials: z.string(),
  bio: z.string(),
  location: z.string(),
  /** Ảnh đại diện do người dùng tải lên; `null` = chưa có (fallback chữ cái đầu). */
  avatarUrl: z.string().nullable(),
  /** Ảnh bìa hồ sơ; `null` = chưa có (fallback khung trung tính). */
  coverUrl: z.string().nullable(),
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
  /**
   * URL ảnh đại diện/ảnh bìa — server kiểm thuộc `avatars/<userId>/` hoặc
   * `covers/<userId>/` khi R2 đã cấu hình. `null` = xoá ảnh, bỏ trống = giữ nguyên.
   */
  avatarUrl: z.string().max(MAX_POST_IMAGE_URL_LENGTH).nullable().optional(),
  coverUrl: z.string().max(MAX_POST_IMAGE_URL_LENGTH).nullable().optional(),
})

/**
 * Một gợi ý người nên theo dõi — `reason` chỉ nói về dữ liệu công khai
 * (số đếm), không nhúng tên người dùng khác (V3-04).
 */
export const userSuggestionSchema = z.object({
  /** Hồ sơ đầy đủ — FE render nút follow ngay mà không cần gọi thêm request. */
  user: userProfileSchema,
  reason: z.string(),
})

/** Body của `GET /users/suggestions` — tối đa 5 gợi ý, rỗng là hợp lệ (không phải 404). */
export const userSuggestionsSchema = z.object({
  items: z.array(userSuggestionSchema).max(5),
})

export type UpdateMeInput = z.infer<typeof updateMeInputSchema>
