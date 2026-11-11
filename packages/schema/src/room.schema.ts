import { z } from "zod"
import type { Room, RoomFilter, RoomMember, RoomProposal } from "./types/room"

/**
 * Schema phòng lọc nhóm (Phase 6) — khớp `Room` và các phần tử con.
 *
 * Hợp đồng mới: trước Phase 6 phòng chỉ sống trong trình duyệt, không có API.
 */

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

/** Body tạo phòng — tên tuỳ chọn, rỗng thì server đặt mặc định. */
export const createRoomInputSchema = z.object({
  name: z.string().trim().max(80).optional(),
})

/**
 * Response tạo phòng: DTO phòng + `guestToken` của owner (cookie HttpOnly tự
 * gửi; trường này chỉ để test/CLI dùng).
 */
export const createRoomResponseSchema = roomSchema.extend({
  guestToken: z.string(),
})

/** Body tham gia phòng — guest không cần tài khoản (D5). */
export const joinRoomInputSchema = z.object({
  displayName: z.string().trim().min(1, "Tên hiển thị trống").max(40),
})

/**
 * Response join: `guestToken` chỉ có khi vừa tạo thành viên mới — client không
 * cần đọc (cookie HttpOnly tự gửi), giữ trong hợp đồng để test/CLI dùng được.
 */
export const joinRoomResponseSchema = z.object({
  room: roomSchema,
  memberId: z.string(),
  joined: z.boolean(),
  guestToken: z.string().optional(),
})

/** Body tạo đề xuất — danh tính lấy từ session/cookie, không từ body. */
export const createProposalInputSchema = z.object({
  kind: z.enum(["include", "exclude"]),
  field: z.enum(["category", "district", "priceMax", "keyword"]),
  value: z.string().trim().min(1, "Giá trị đề xuất trống").max(80),
})
