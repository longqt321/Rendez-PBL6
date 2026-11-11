import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"
import {
  parseApiCategory,
  toApiProposalField,
  toPrismaCategory,
  toPrismaProposalField,
} from "./enums"
import type { Room, RoomFilter, RoomMember, RoomProposal, RoomProposalField } from "@rendez/schema"

/**
 * Phòng lọc nhóm (Phase 6) — port logic `frontend/src/features/rooms/lib/room.ts`
 * sang server, lưu ở Postgres thay cho localStorage.
 *
 * Quy tắc giữ nguyên: thêm đề xuất mới nhất lên đầu; áp đề xuất include thì
 * thêm vào danh sách chọn và bỏ khỏi danh sách loại (và ngược lại); `priceMax`
 * chỉ áp dụng cho `include`; rời phòng xoá luôn đề xuất của thành viên đó.
 */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const CODE_LENGTH = 6
const DEFAULT_ROOM_NAME = "Phòng lọc nhóm"

/** Nhãn loại hình — khớp `CATEGORY_META` của frontend để toast không lệch chữ. */
const CATEGORY_LABEL: Record<string, string> = {
  cafe: "Cà phê",
  restaurant: "Quán ăn",
  "street-food": "Ăn vặt",
  bakery: "Tiệm bánh",
  dessert: "Tráng miệng",
  bar: "Quán bar",
}

/** Mã phòng 6 ký tự, bỏ O/0/I/1 (dễ nhầm khi đọc qua điện thoại). */
export function generateRoomCode(): string {
  let code = ""
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return code
}

export function createEmptyFilter(): RoomFilter {
  return {
    categories: [],
    excludedCategories: [],
    districts: [],
    excludedDistricts: [],
    includeKeywords: [],
    excludeKeywords: [],
  }
}

/** Đọc filter JSONB của DB thành `RoomFilter` — dữ liệu cũ thiếu khoá thì bù rỗng. */
export function parseRoomFilter(raw: unknown): RoomFilter {
  const base = createEmptyFilter()
  if (typeof raw !== "object" || raw === null) return base
  const value = raw as Partial<Record<keyof RoomFilter, unknown>>
  const list = (input: unknown): string[] =>
    Array.isArray(input) ? input.filter((item): item is string => typeof item === "string") : []

  const priceRaw = Number(value.priceMax)
  const priceMax =
    priceRaw === 1 || priceRaw === 2 || priceRaw === 3 ? (priceRaw as 1 | 2 | 3) : undefined

  return {
    // Loại hình lạ (dữ liệu cũ/hỏng) bị bỏ qua thay vì làm sập route — filter
    // JSONB không được phép biến một phòng thành 500.
    categories: list(value.categories)
      .map(parseApiCategory)
      .filter((item): item is RoomFilter["categories"][number] => item !== null),
    excludedCategories: list(value.excludedCategories)
      .map(parseApiCategory)
      .filter((item): item is RoomFilter["excludedCategories"][number] => item !== null),
    districts: list(value.districts),
    excludedDistricts: list(value.excludedDistricts),
    includeKeywords: list(value.includeKeywords),
    excludeKeywords: list(value.excludeKeywords),
    ...(priceMax ? { priceMax } : {}),
  }
}

/** Ghi filter xuống JSONB — enum loại hình lưu dạng Prisma (`street_food`). */
export function serializeRoomFilter(filter: RoomFilter): Prisma.InputJsonValue {
  return {
    categories: filter.categories.map(toPrismaCategory),
    excludedCategories: filter.excludedCategories.map(toPrismaCategory),
    districts: filter.districts,
    excludedDistricts: filter.excludedDistricts,
    includeKeywords: filter.includeKeywords,
    excludeKeywords: filter.excludeKeywords,
    ...(filter.priceMax ? { priceMax: filter.priceMax } : {}),
  } as Prisma.InputJsonValue
}

const ROOM_INCLUDE = {
  members: { orderBy: { joinedAt: "asc" } },
  proposals: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.RoomInclude

type RoomWithRelations = Prisma.RoomGetPayload<{ include: typeof ROOM_INCLUDE }>

/**
 * Dựng DTO `Room`.
 *
 * `isMe` xác định theo hai đường: thành viên gắn tài khoản (so `userId` với
 * người đang gọi) hoặc khách (client giữ `memberId` và gửi lại trong query).
 */
export function toRoomDto(
  room: RoomWithRelations,
  viewerId: string | null,
  viewerMemberId: string | null,
): Room {
  const members: RoomMember[] = room.members.map((member) => ({
    id: member.id,
    displayName: member.displayName,
    isMe:
      (viewerId !== null && member.userId === viewerId) ||
      (viewerMemberId !== null && member.id === viewerMemberId),
    joinedAt: member.joinedAt.toISOString(),
  }))

  const proposals: RoomProposal[] = room.proposals.map((proposal) => ({
    id: proposal.id,
    memberId: proposal.memberId,
    kind: proposal.kind,
    field: toApiProposalField(proposal.field),
    value: proposal.value,
    status: proposal.status,
    createdAt: proposal.createdAt.toISOString(),
  }))

  return {
    id: room.id,
    code: room.code,
    name: room.name,
    members,
    proposals,
    filter: parseRoomFilter(room.filter),
    createdAt: room.createdAt.toISOString(),
  }
}

/** Tạo phòng — sinh mã và thử lại khi trùng (unique ở DB là chốt cuối). */
export async function createRoom(
  ownerId: string,
  name: string | undefined,
  displayName: string,
): Promise<RoomWithRelations> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode()
    try {
      return await prisma.room.create({
        data: {
          code,
          name: name?.trim() || DEFAULT_ROOM_NAME,
          ownerId,
          filter: serializeRoomFilter(createEmptyFilter()),
          members: {
            create: { userId: ownerId, displayName, isGuest: false },
          },
        },
        include: ROOM_INCLUDE,
      })
    } catch (error) {
      // P2002 = trùng mã phòng; thử mã khác. Lỗi khác phải nổi lên.
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        continue
      }
      throw error
    }
  }
  throw new Error("Không sinh được mã phòng không trùng sau 5 lần")
}

export async function findRoomByCode(code: string): Promise<RoomWithRelations | null> {
  return prisma.room.findUnique({ where: { code }, include: ROOM_INCLUDE })
}

/** Thêm thành viên khách; trùng tên (không phân biệt hoa thường) trả thành viên cũ. */
export async function joinRoom(
  room: RoomWithRelations,
  displayName: string,
): Promise<{ room: RoomWithRelations; memberId: string; joined: boolean }> {
  const name = displayName.trim()
  const existing = room.members.find(
    (member) => member.displayName.toLowerCase() === name.toLowerCase(),
  )
  if (existing) return { room, memberId: existing.id, joined: false }

  const member = await prisma.roomMember.create({
    data: { roomId: room.id, displayName: name, isGuest: true },
    select: { id: true },
  })
  const updated = await findRoomByCode(room.code)
  if (!updated) throw new Error("Phòng biến mất sau khi thêm thành viên")
  return { room: updated, memberId: member.id, joined: true }
}

export async function addProposal(
  room: RoomWithRelations,
  input: { memberId: string; kind: "include" | "exclude"; field: RoomProposalField; value: string },
): Promise<RoomWithRelations> {
  await prisma.roomProposal.create({
    data: {
      roomId: room.id,
      memberId: input.memberId,
      kind: input.kind,
      field: toPrismaProposalField(input.field),
      value: input.value.trim(),
    },
  })
  const updated = await findRoomByCode(room.code)
  if (!updated) throw new Error("Phòng biến mất sau khi thêm đề xuất")
  return updated
}

/** Áp đề xuất vào filter chung — port 1:1 `applyProposal` của frontend. */
/**
 * Kiểm + chuẩn hoá giá trị đề xuất theo `field` — trả `null` khi không hợp lệ
 * (route trả 400) thay vì lưu rác vào filter JSONB làm phòng hỏng vĩnh viễn:
 * `category` phải là loại hình đã biết; `priceMax` phải là 1–3; district/keyword
 * là chuỗi tuỳ ý (đã trim ở zod).
 */
export function normalizeProposalValue(field: RoomProposalField, value: string): string | null {
  if (field === "category") return parseApiCategory(value)
  if (field === "priceMax") return value === "1" || value === "2" || value === "3" ? value : null
  return value
}

export function applyProposalToFilter(
  filter: RoomFilter,
  proposal: { kind: "include" | "exclude"; field: RoomProposalField; value: string },
): RoomFilter {
  const value = proposal.value

  if (proposal.field === "category") {
    const category = value as RoomFilter["categories"][number]
    return proposal.kind === "include"
      ? {
          ...filter,
          categories: [...new Set([...filter.categories, category])],
          excludedCategories: filter.excludedCategories.filter((item) => item !== category),
        }
      : {
          ...filter,
          excludedCategories: [...new Set([...filter.excludedCategories, category])],
          categories: filter.categories.filter((item) => item !== category),
        }
  }

  if (proposal.field === "district") {
    return proposal.kind === "include"
      ? {
          ...filter,
          districts: [...new Set([...filter.districts, value])],
          excludedDistricts: filter.excludedDistricts.filter((item) => item !== value),
        }
      : {
          ...filter,
          excludedDistricts: [...new Set([...filter.excludedDistricts, value])],
          districts: filter.districts.filter((item) => item !== value),
        }
  }

  if (proposal.field === "priceMax") {
    // "exclude" với mức giá không có nghĩa — chỉ ghi nhận khi là include.
    if (proposal.kind !== "include") return filter
    const parsed = Number(value)
    const priceMax = (parsed === 1 || parsed === 2 || parsed === 3 ? parsed : 3) as 1 | 2 | 3
    return { ...filter, priceMax }
  }

  return proposal.kind === "include"
    ? { ...filter, includeKeywords: [...new Set([...filter.includeKeywords, value])] }
    : { ...filter, excludeKeywords: [...new Set([...filter.excludeKeywords, value])] }
}

/** Mô tả ngắn để client hiện toast — khớp `describeProposal` của frontend. */
export function describeProposal(proposal: {
  kind: "include" | "exclude"
  field: RoomProposalField
  value: string
}): string {
  const sign = proposal.kind === "include" ? "＋" : "－"
  if (proposal.field === "category") {
    return `${sign} Loại hình: ${CATEGORY_LABEL[proposal.value] ?? proposal.value}`
  }
  if (proposal.field === "district") return `${sign} Quận: ${proposal.value}`
  if (proposal.field === "priceMax") {
    return `＋ Mức giá tối đa: ${"₫".repeat(Number(proposal.value) || 3)}`
  }
  return `${sign} Từ khoá: ${proposal.value}`
}

export type { RoomWithRelations }
