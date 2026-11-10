import { placeSuggestionSchema } from "@/features/places/types/place.schema"
import { z } from "zod"
import type { AppNotification } from "./notification"

/**
 * Thông báo — khớp `AppNotification` (union 3 kind).
 *
 * `ActorNotification` dùng chung cho like/comment/follow nên không tách được
 * bằng `z.discriminatedUnion` ở kind đó — dùng `z.union` cho cả bộ ba.
 */
export const notificationSchema = z.union([
  z.object({
    kind: z.literal("place-suggestion"),
    id: z.string(),
    createdAt: z.string(),
    read: z.boolean(),
    postId: z.string(),
    postCaption: z.string(),
    postPlaceId: z.string().nullable(),
    suggestions: z.array(placeSuggestionSchema),
  }),
  z.object({
    kind: z.enum(["like", "comment", "follow"]),
    id: z.string(),
    createdAt: z.string(),
    read: z.boolean(),
    actorName: z.string(),
    actorInitials: z.string(),
    postId: z.string().optional(),
    excerpt: z.string().optional(),
  }),
  z.object({
    kind: z.literal("system"),
    id: z.string(),
    createdAt: z.string(),
    read: z.boolean(),
    title: z.string(),
    body: z.string(),
  }),
]) satisfies z.ZodType<AppNotification>
