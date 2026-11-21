import { z } from "zod"
import type { Room, RoomFilter, RoomMember, RoomProposal } from "./types/room"

const placeCategoryEnum = z.enum([
  "cafe",
  "restaurant",
  "street-food",
  "bakery",
  "dessert",
  "bar",
])

export const roomMemberSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  isMe: z.boolean(),
  joinedAt: z.string(),
}) satisfies z.ZodType<RoomMember>

export const roomProposalSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  kind: z.enum(["include", "exclude"]),
  field: z.enum(["category", "district", "priceMax", "keyword"]),
  value: z.string(),
  status: z.enum(["open", "applied", "dismissed"]),
  createdAt: z.string(),
}) satisfies z.ZodType<RoomProposal>

export const roomFilterSchema = z.object({
  categories: z.array(placeCategoryEnum),
  excludedCategories: z.array(placeCategoryEnum),
  districts: z.array(z.string()),
  excludedDistricts: z.array(z.string()),
  includeKeywords: z.array(z.string()),
  excludeKeywords: z.array(z.string()),
  priceMax: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
}) satisfies z.ZodType<RoomFilter>

export const roomSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  members: z.array(roomMemberSchema),
  proposals: z.array(roomProposalSchema),
  filter: roomFilterSchema,
  createdAt: z.string(),
}) satisfies z.ZodType<Room>

export const appliedProposalSchema = z.object({
  room: roomSchema,
  summary: z.string(),
})

export const createRoomInputSchema = z.object({
  name: z.string().trim().max(80).optional(),
})

export const createRoomResponseSchema = roomSchema.extend({
  guestToken: z.string(),
})

export const joinRoomInputSchema = z.object({
  displayName: z.string().trim().min(1, "Tên hiển thị trống").max(40),
})

export const joinRoomResponseSchema = z.object({
  room: roomSchema,
  memberId: z.string(),
  joined: z.boolean(),
  guestToken: z.string().optional(),
})

export const createProposalInputSchema = z.object({
  kind: z.enum(["include", "exclude"]),
  field: z.enum(["category", "district", "priceMax", "keyword"]),
  value: z.string().trim().min(1, "Giá trị đề xuất trống").max(80),
  autoApply: z.boolean().optional(),
})

export const roomFilterTargetSchema = z.object({
  kind: z.enum(["include", "exclude"]),
  field: z.enum(["category", "district", "priceMax", "keyword"]),
  value: z.string().trim().min(1, "Giá trị lọc trống").max(80),
})

export const updateRoomFilterInputSchema = z.union([
  z.object({
    action: z.literal("reset"),
  }),
  z.object({
    action: z.enum(["remove", "toggle"]),
    kind: z.enum(["include", "exclude"]),
    field: z.enum(["category", "district", "priceMax", "keyword"]),
    value: z.string().trim().min(1, "Giá trị lọc trống").max(80),
  }),
  z.object({
    action: z.literal("replace"),
    items: z.array(roomFilterTargetSchema).max(20),
  }),
])

export type CreateProposalInput = z.infer<typeof createProposalInputSchema>
export type UpdateRoomFilterInput = z.infer<typeof updateRoomFilterInputSchema>
