import { z } from "zod"
import {
  MAX_PROFILE_BIO_LENGTH,
  MAX_PROFILE_LOCATION_LENGTH,
  MAX_PROFILE_NAME_LENGTH,
} from "./constants"
import { MAX_POST_IMAGE_URL_LENGTH } from "./post-images"
import type { UserProfile } from "./types/profile"

export const userProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  initials: z.string(),
  bio: z.string(),
  location: z.string(),

  avatarUrl: z.string().nullable(),

  coverUrl: z.string().nullable(),
  joinedAt: z.string(),
  postCount: z.number(),
  followerCount: z.number(),
  followingCount: z.number(),
  followedByMe: z.boolean(),
  isMe: z.boolean(),
  privateProfile: z.boolean(),
}) satisfies z.ZodType<UserProfile>

export const updateMeInputSchema = z.object({
  name: z.string().min(2).max(MAX_PROFILE_NAME_LENGTH),
  bio: z.string().max(MAX_PROFILE_BIO_LENGTH),
  location: z.string().max(MAX_PROFILE_LOCATION_LENGTH),
  privateProfile: z.boolean(),

  avatarUrl: z.string().max(MAX_POST_IMAGE_URL_LENGTH).nullable().optional(),
  coverUrl: z.string().max(MAX_POST_IMAGE_URL_LENGTH).nullable().optional(),
})

export const userSuggestionSchema = z.object({

  user: userProfileSchema,
  reason: z.string(),
})

export const userSuggestionsSchema = z.object({
  items: z.array(userSuggestionSchema).max(5),
})

export type UpdateMeInput = z.infer<typeof updateMeInputSchema>
