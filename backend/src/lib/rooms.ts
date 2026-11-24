import { randomInt } from "node:crypto"
import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"
import { getRoomMemberLocations, type EphemeralMemberLocation } from "./room-location"
import {
  applyProposalToFilter,
  normalizeProposalValue,
  removeFilterConstraint,
  toggleFilterConstraint,
} from "./rooms/filter-ops"
import { ApiError, isUniqueViolation } from "./errors"
import { ROOM_TOKEN_TTL_SECONDS, hashRoomToken, issueRoomToken } from "./room-token"
import {
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
  members: {
    orderBy: { joinedAt: "asc" },
    include: { user: { select: { avatarUrl: true } } },
  },
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
  locations?: ReadonlyMap<string, EphemeralMemberLocation>,
): Room {
  const members: RoomMember[] = room.members.map((member) => {
    const loc = locations?.get(member.id)
    return {
      id: member.id,
      displayName: member.displayName,
      avatarUrl: member.user?.avatarUrl ?? null,
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
      locationLabel: loc?.locationLabel ?? null,
      isMe:
        (viewerId !== null && member.userId === viewerId) ||
        (viewerMemberId !== null && member.id === viewerMemberId),
      isOwner: member.userId !== null && member.userId === room.ownerId,
      joinedAt: member.joinedAt.toISOString(),
    }
  })

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
  viewerId?: string | null,
): Promise<{ room: RoomWithRelations; memberId: string; joined: boolean; guestToken?: string }> {
  const name = displayName.trim()

  // Người dùng đã đăng nhập đã ở trong phòng → nhận diện lại ngay kể cả trên thiết bị khác (không báo 409 trùng tên).
  if (viewerId) {
    const existingByUser = room.members.find((member) => member.userId === viewerId)
    if (existingByUser) {
      await touchMemberSeen(existingByUser.id)
      return { room, memberId: existingByUser.id, joined: false }
    }
  }

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
        ...(viewerId ? { userId: viewerId } : {}),
        displayName: name,
        isGuest: !viewerId,
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

export async function listRoomsForUser(userId: string) {
  const rows = await prisma.room.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      code: true,
      name: true,
      phase: true,
      winnerPlaceId: true,
      createdAt: true,
      _count: {
        select: {
          members: true,
          candidates: true,
        },
      },
    },
  })
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    phase: r.phase,
    memberCount: r._count.members,
    candidateCount: r._count.candidates,
    winnerPlaceId: r.winnerPlaceId ?? null,
    createdAt: r.createdAt.toISOString(),
  }))
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
  // Giới hạn mỗi thành viên tối đa 1 mức ngân sách trần `priceMax`: chọn mức mới tự động thay mức cũ.
  if (input.field === "priceMax" && input.kind === "include") {
    await prisma.roomProposal.deleteMany({
      where: {
        roomId: room.id,
        memberId: input.memberId,
        field: "price_max",
        kind: "include",
      },
    })
  }
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

export {
  applyProposalToFilter,
  describeProposal,
  normalizeProposalValue,
  removeFilterConstraint,
  toggleFilterConstraint,
} from "./rooms/filter-ops"
export type { RoomWithRelations }

export async function toRoomDtoAsync(
  room: RoomWithRelations,
  viewerId: string | null,
  viewerMemberId: string | null,
): Promise<Room> {
  const locations = await getRoomMemberLocations(
    room.code,
    room.members.map((m) => m.id),
  )
  return toRoomDto(room, viewerId, viewerMemberId, locations)
}
