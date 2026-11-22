import { randomInt } from "node:crypto"
import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"
import { ApiError, isUniqueViolation } from "./errors"
import { ROOM_TOKEN_TTL_SECONDS, hashRoomToken, issueRoomToken } from "./room-token"
import {
  CATEGORY_LABEL,
  parseApiCategory,
  toApiCategory,
  toApiProposalField,
  toPrismaCategory,
  toPrismaProposalField,
} from "./enums"
import type {
  Room,
  RoomCandidate,
  RoomFilter,
  RoomMember,
  RoomProposal,
  RoomProposalField,
  RoomVoteSummary,
  UpdateRoomFilterInput,
} from "@rendez/schema"

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
  candidates: {
    orderBy: { createdAt: "asc" },
    include: {
      place: {
        include: {
          images: { orderBy: { position: "asc" }, take: 1 },
          placeTags: { include: { tag: true }, orderBy: { position: "asc" } },
          reviews: { where: { deletedAt: null }, select: { tier: true } },
        },
      },
    },
  },
  votes: true,
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

  const myMemberId = members.find((m) => m.isMe)?.id ?? null

  const proposals: RoomProposal[] = room.proposals.map((proposal) => ({
    id: proposal.id,
    memberId: proposal.memberId,
    kind: proposal.kind,
    field: toApiProposalField(proposal.field),
    value: proposal.value,
    status: proposal.status,
    createdAt: proposal.createdAt.toISOString(),
  }))

  const candidates: RoomCandidate[] = room.candidates.map((cand) => {
    const p = cand.place
    const totalReviews = p.reviews.length
    const positiveCount = p.reviews.filter((r) => r.tier === "good" || r.tier === "must_try").length
    const positiveRatio = totalReviews > 0 ? Math.round((100 * positiveCount) / totalReviews) : 0
    const img = p.images[0]
    return {
      id: cand.id,
      placeId: cand.placeId,
      addedByMemberId: cand.addedByMemberId,
      createdAt: cand.createdAt.toISOString(),
      place: {
        id: p.id,
        name: p.name,
        address: p.address,
        city: p.city,
        ...(p.district ? { district: p.district } : {}),
        category: toApiCategory(p.category),
        tags: p.placeTags.map((pt) => pt.tag.name),
        positiveRatio,
        reviewCount: totalReviews,
        priceLevel: (p.priceLevel === 1 || p.priceLevel === 2 || p.priceLevel === 3
          ? p.priceLevel
          : 2) as 1 | 2 | 3,
        ...(img ? { imageUrl: img.url, imageHeight: img.height } : { imageHeight: 320 }),
        ...(p.lat !== null ? { lat: p.lat } : {}),
        ...(p.lng !== null ? { lng: p.lng } : {}),
        status: p.status,
        ...(p.description ? { description: p.description } : {}),
        ...(p.openingHours ? { openingHours: p.openingHours } : {}),
        publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
      },
    }
  })

  const activeMemberIds = new Set(members.map((m) => m.id))
  const votedMemberIds = new Set<string>()
  const voteSummaries: RoomVoteSummary[] = candidates.map((cand) => {
    const candVotes = room.votes.filter((v) => v.candidateId === cand.id)
    let likeCount = 0
    let passCount = 0
    let myDecision: "like" | "pass" | undefined
    let myRank: number | undefined
    for (const v of candVotes) {
      if (activeMemberIds.has(v.memberId)) votedMemberIds.add(v.memberId)
      if (v.decision === "like") likeCount++
      if (v.decision === "pass") passCount++
      if (myMemberId && v.memberId === myMemberId) {
        if (v.decision === "like" || v.decision === "pass") myDecision = v.decision
        if (v.rank !== null) myRank = v.rank
      }
    }
    return {
      candidateId: cand.id,
      likeCount,
      passCount,
      ...(myDecision ? { myDecision } : {}),
      ...(myRank ? { myRank } : {}),
    }
  })

  const matchedCandidateIds =
    members.length > 0
      ? voteSummaries.filter((s) => s.likeCount >= members.length).map((s) => s.candidateId)
      : []

  return {
    id: room.id,
    code: room.code,
    name: room.name,
    phase: room.phase,
    votingMode: room.votingMode,
    votingDeadlineAt: room.votingDeadlineAt ? room.votingDeadlineAt.toISOString() : null,
    winnerPlaceId: room.winnerPlaceId ?? null,
    lockedAt: room.lockedAt ? room.lockedAt.toISOString() : null,
    members,
    proposals,
    candidates,
    voteSummaries,
    votingProgress: {
      votedMemberIds: [...votedMemberIds],
      totalActiveMembers: members.length,
      matchedCandidateIds,
    },
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
  input: {
    memberId: string
    kind: "include" | "exclude"
    field: RoomProposalField
    value: string
    autoApply?: boolean
  },
): Promise<RoomWithRelations> {
  if (input.autoApply) {
    await prisma.$transaction(async (tx) => {
      await tx.roomProposal.create({
        data: {
          roomId: room.id,
          memberId: input.memberId,
          kind: input.kind,
          field: toPrismaProposalField(input.field),
          value: input.value.trim(),
          status: "applied",
          appliedBy: input.memberId,
          appliedAt: new Date(),
        },
      })
      const [current] = await tx.$queryRaw<{ filter: unknown; version: number }[]>`
        SELECT filter, version FROM rooms WHERE id = ${room.id}::uuid FOR UPDATE
      `
      if (!current) throw new Error("Phòng không tồn tại")
      const nextFilter = applyProposalToFilter(parseRoomFilter(current.filter), {
        kind: input.kind,
        field: input.field,
        value: input.value.trim(),
      })
      await tx.room.update({
        where: { id: room.id, version: current.version },
        data: {
          filter: serializeRoomFilter(nextFilter),
          version: { increment: 1 },
        },
      })
    })
  } else {
    await prisma.roomProposal.create({
      data: {
        roomId: room.id,
        memberId: input.memberId,
        kind: input.kind,
        field: toPrismaProposalField(input.field),
        value: input.value.trim(),
      },
    })
  }
  const updated = await findRoomByCode(room.code)
  if (!updated) throw new Error("Phòng biến mất sau khi thêm đề xuất")
  return updated
}

export function normalizeProposalValue(field: RoomProposalField, value: string): string | null {
  if (field === "category") return parseApiCategory(value)
  if (field === "priceMax") return value === "1" || value === "2" || value === "3" ? value : null
  return value
}

export function removeFilterConstraint(
  filter: RoomFilter,
  target: { kind: "include" | "exclude"; field: RoomProposalField; value: string },
): RoomFilter {
  const value = target.value.trim()
  if (target.field === "category") {
    const category = parseApiCategory(value)
    if (!category) return filter
    return target.kind === "include"
      ? { ...filter, categories: filter.categories.filter((c) => c !== category) }
      : { ...filter, excludedCategories: filter.excludedCategories.filter((c) => c !== category) }
  }
  if (target.field === "district") {
    return target.kind === "include"
      ? { ...filter, districts: filter.districts.filter((d) => d !== value) }
      : { ...filter, excludedDistricts: filter.excludedDistricts.filter((d) => d !== value) }
  }
  if (target.field === "priceMax") {
    const rest = { ...filter }
    delete rest.priceMax
    return rest
  }
  return target.kind === "include"
    ? { ...filter, includeKeywords: filter.includeKeywords.filter((k) => k !== value) }
    : { ...filter, excludeKeywords: filter.excludeKeywords.filter((k) => k !== value) }
}

function hasFilterConstraint(
  filter: RoomFilter,
  target: { kind: "include" | "exclude"; field: RoomProposalField; value: string },
): boolean {
  const value = target.value.trim()
  if (target.field === "category") {
    const category = parseApiCategory(value)
    if (!category) return false
    return target.kind === "include"
      ? filter.categories.includes(category)
      : filter.excludedCategories.includes(category)
  }
  if (target.field === "district") {
    return target.kind === "include"
      ? filter.districts.includes(value)
      : filter.excludedDistricts.includes(value)
  }
  if (target.field === "priceMax") {
    return filter.priceMax !== undefined && String(filter.priceMax) === value
  }
  return target.kind === "include"
    ? filter.includeKeywords.includes(value)
    : filter.excludeKeywords.includes(value)
}

export function toggleFilterConstraint(
  filter: RoomFilter,
  target: { kind: "include" | "exclude"; field: RoomProposalField; value: string },
): RoomFilter {
  return hasFilterConstraint(filter, target)
    ? removeFilterConstraint(filter, target)
    : applyProposalToFilter(filter, target)
}

export async function updateRoomFilter(
  roomId: string,
  code: string,
  input: UpdateRoomFilterInput,
): Promise<RoomWithRelations> {
  await prisma.$transaction(async (tx) => {
    let nextFilter: RoomFilter
    if (input.action === "reset") {
      nextFilter = createEmptyFilter()
    } else if (input.action === "replace") {
      let built = createEmptyFilter()
      for (const item of input.items) {
        const normalized = normalizeProposalValue(item.field, item.value)
        if (normalized === null) {
          throw new ApiError(400, "Giá trị bộ lọc không hợp lệ")
        }
        built = applyProposalToFilter(built, {
          kind: item.kind,
          field: item.field,
          value: normalized,
        })
      }
      nextFilter = built
    } else {
      const normalized = normalizeProposalValue(input.field, input.value)
      if (normalized === null) {
        throw new ApiError(400, "Giá trị bộ lọc không hợp lệ")
      }
      const current = await tx.room.findUniqueOrThrow({ where: { id: roomId } })
      const parsedFilter = parseRoomFilter(current.filter)
      const target = { kind: input.kind, field: input.field, value: normalized }
      nextFilter =
        input.action === "remove"
          ? removeFilterConstraint(parsedFilter, target)
          : toggleFilterConstraint(parsedFilter, target)
    }

    await tx.room.update({
      where: { id: roomId },
      data: { filter: serializeRoomFilter(nextFilter) },
    })
  })

  const updated = await findRoomByCode(code)
  if (!updated) throw new Error("Phòng biến mất sau khi cập nhật bộ lọc")
  return updated
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
