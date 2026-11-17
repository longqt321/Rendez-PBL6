import { randomInt } from "node:crypto"
import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"
import { ApiError, isUniqueViolation } from "./errors"
import { ROOM_TOKEN_TTL_SECONDS, hashRoomToken, issueRoomToken } from "./room-token"
import {
  CATEGORY_LABEL,
  parseApiCategory,
  toApiProposalField,
  toPrismaCategory,
  toPrismaProposalField,
} from "./enums"
import type { Room, RoomFilter, RoomMember, RoomProposal, RoomProposalField } from "@rendez/schema"

const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
const CODE_LENGTH = 6
const CODE_SPACE = CODE_ALPHABET.length ** CODE_LENGTH
const DEFAULT_ROOM_NAME = "Phòng lọc nhóm"

export function generateRoomCode(): string {
  let value = randomInt(0, CODE_SPACE)
  let code = ""
  for (let i = 0; i < CODE_LENGTH; i++) {
    code = CODE_ALPHABET[value % CODE_ALPHABET.length] + code
    value = Math.floor(value / CODE_ALPHABET.length)
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

export async function createRoom(
  ownerId: string,
  name: string | undefined,
  displayName: string,
): Promise<{ room: RoomWithRelations; guestToken: string }> {
  const guestToken = issueRoomToken()
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode()
    try {
      const room = await prisma.room.create({
        data: {
          code,
          name: name?.trim() || DEFAULT_ROOM_NAME,
          ownerId,
          filter: serializeRoomFilter(createEmptyFilter()),
          members: {
            create: {
              userId: ownerId,
              displayName,
              isGuest: false,
              tokenHash: hashRoomToken(guestToken),
            },
          },
        },
        include: ROOM_INCLUDE,
      })
      return { room, guestToken }
    } catch (error) {
      // P2002 = trùng mã phòng; thử mã khác. Lỗi khác phải nổi lên.
      if (isUniqueViolation(error)) continue
      throw error
    }
  }
  throw new Error("Không sinh được mã phòng không trùng sau 5 lần")
}

export async function findRoomByCode(code: string): Promise<RoomWithRelations | null> {
  const room = await prisma.room.findUnique({ where: { code }, include: ROOM_INCLUDE })
  if (!room) return null

  // TTL token 24h không hoạt động: dọn token của thành viên quá hạn khi load
  // phòng — token chết không thể dùng để mạo danh vĩnh viễn.
  const cutoff = new Date(Date.now() - ROOM_TOKEN_TTL_SECONDS * 1000)
  const staleIds = room.members
    .filter((member) => member.tokenHash !== null && member.lastSeenAt < cutoff)
    .map((member) => member.id)
  if (staleIds.length > 0) {
    await prisma.roomMember.updateMany({
      where: { id: { in: staleIds } },
      data: { tokenHash: null },
    })
    return prisma.room.findUnique({ where: { code }, include: ROOM_INCLUDE }) ?? room
  }
  return room
}

export async function touchMemberSeen(memberId: string): Promise<void> {
  // `updateMany` idempotent: thành viên vừa bị xoá không sinh lỗi P2025.
  await prisma.roomMember.updateMany({
    where: { id: memberId },
    data: { lastSeenAt: new Date() },
  })
}

export async function joinRoom(
  room: RoomWithRelations,
  displayName: string,
  presentedToken?: string,
): Promise<{ room: RoomWithRelations; memberId: string; joined: boolean; guestToken?: string }> {
  const name = displayName.trim()

  // Token cũ khớp thành viên nào đó → chính là người đó quay lại (reload/join
  // lại): idempotent thật, không tạo thành viên trùng và không thể mạo danh.
  if (presentedToken) {
    const hash = hashRoomToken(presentedToken)
    const known = room.members.find((member) => member.tokenHash === hash)
    if (known) return { room, memberId: known.id, joined: false }
  }

  const duplicate = room.members.some(
    (member) => member.displayName.toLowerCase() === name.toLowerCase(),
  )
  if (duplicate) throw new ApiError(409, "Tên này đã có người dùng trong phòng")

  const guestToken = issueRoomToken()
  try {
    const member = await prisma.roomMember.create({
      data: {
        roomId: room.id,
        displayName: name,
        isGuest: true,
        tokenHash: hashRoomToken(guestToken),
      },
      select: { id: true },
    })
    const updated = await findRoomByCode(room.code)
    if (!updated) throw new Error("Phòng biến mất sau khi thêm thành viên")
    return { room: updated, memberId: member.id, joined: true, guestToken }
  } catch (error) {
    // Unique (room_id, lower(display_name)) là chốt cuối cho race giữa hai
    // request join cùng tên: lookup lại và trả thành viên đã có.
    if (isUniqueViolation(error)) {
      const existing = room.members.find(
        (member) => member.displayName.toLowerCase() === name.toLowerCase(),
      )
      if (existing) return { room, memberId: existing.id, joined: false }
      throw new ApiError(409, "Tên này đã có người dùng trong phòng")
    }
    throw error
  }
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
    // Giá trị lạ (dữ liệu cũ) bị bỏ qua — không ép kiểu mù vào enum.
    const category = parseApiCategory(value)
    if (!category) return filter
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
    // Giá trị lạ (dữ liệu cũ) KHÔNG được tự quy về 3 — bỏ qua đề xuất thay vì
    // âm thầm áp một mức giá người dùng không chọn.
    if (parsed !== 1 && parsed !== 2 && parsed !== 3) return filter
    return { ...filter, priceMax: parsed }
  }

  return proposal.kind === "include"
    ? { ...filter, includeKeywords: [...new Set([...filter.includeKeywords, value])] }
    : { ...filter, excludeKeywords: [...new Set([...filter.excludeKeywords, value])] }
}

export function describeProposal(proposal: {
  kind: "include" | "exclude"
  field: RoomProposalField
  value: string
}): string {
  const sign = proposal.kind === "include" ? "＋" : "－"
  if (proposal.field === "category") {
    const category = parseApiCategory(proposal.value)
    return `${sign} Loại hình: ${category ? CATEGORY_LABEL[category] : proposal.value}`
  }
  if (proposal.field === "district") return `${sign} Quận: ${proposal.value}`
  if (proposal.field === "priceMax") {
    // Giá trị lạ thì hiện "—" — KHÔNG tự quy về 3 (trái với applyProposalToFilter,
    // nơi giá trị lạ bị bỏ qua; mô tả phải phản ánh đúng điều đã xảy ra).
    const level = Number(proposal.value)
    const label = level === 1 || level === 2 || level === 3 ? "₫".repeat(level) : "—"
    return `＋ Mức giá tối đa: ${label}`
  }
  return `${sign} Từ khoá: ${proposal.value}`
}

export type { RoomWithRelations }
