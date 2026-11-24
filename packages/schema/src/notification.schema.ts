import { placeSuggestionSchema } from "./place.schema"
import { z } from "zod"
import type { AppNotification } from "./types/notification"

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
    actorHandle: z.string().optional(),
    actorAvatarUrl: z.string().nullable().optional(),
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
  z.object({
    kind: z.literal("direct-message"),
    id: z.string(),
    createdAt: z.string(),
    read: z.boolean(),
    actorName: z.string(),
    actorInitials: z.string(),
    actorHandle: z.string().optional(),
    actorAvatarUrl: z.string().nullable().optional(),
    messageExcerpt: z.string().optional(),
  }),
  z.object({
    kind: z.literal("room-event"),
    id: z.string(),
    createdAt: z.string(),
    read: z.boolean(),
    roomCode: z.string(),
    roomName: z.string(),
    eventType: z.enum(["voting_started", "room_finalized"]),
    winnerPlaceName: z.string().optional(),
  }),
]) satisfies z.ZodType<AppNotification>
