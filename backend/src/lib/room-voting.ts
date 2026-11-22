import { randomInt } from "node:crypto"
import { InstantRunoff } from "votes"
import { prisma } from "./prisma"
import { ApiError } from "./errors"
import { findRoomByCode } from "./rooms"
import { publishRoom } from "./room-events"
import type { CastRoomVoteInput, RoomVotingMode } from "@rendez/schema"

const MAX_ROOM_CANDIDATES = 15

export interface RankedBallot {
  memberId: string
  /** Danh sách candidateId theo thứ tự ưu tiên từ #1 -> #3 */
  choices: string[]
}

/**
 * Instant-Runoff Voting (IRV) sử dụng thư viện chuẩn `votes`.
 */
export function computeInstantRunoffWinner(
  candidateIds: string[],
  ballots: RankedBallot[],
): string | null {
  if (candidateIds.length === 0) return null
  if (ballots.length === 0) return candidateIds[0] ?? null

  const candidateSet = new Set(candidateIds)
  const validBallots = ballots
    .map((ballot) => ballot.choices.filter((cid) => candidateSet.has(cid)))
    .filter((choices) => choices.length > 0)
    .map((choices) => ({
      ranking: choices.map((cid) => [cid]),
      weight: 1,
    }))

  if (validBallots.length === 0) return candidateIds[0] ?? null

  const election = new InstantRunoff({
    candidates: candidateIds,
    ballots: validBallots,
  })
  const ranking = election.ranking()
  const topTier = ranking[0]
  if (!topTier || topTier.length === 0) return candidateIds[0] ?? null

  // Nếu hòa ở hạng 1, ưu tiên theo thứ tự xuất hiện ban đầu trong candidateIds để giữ tính tất định.
  const topSet = new Set(topTier)
  return candidateIds.find((id) => topSet.has(id)) ?? topTier[0] ?? null
}

export async function addRoomCandidate(code: string, memberId: string, placeId: string) {
  const room = await findRoomByCode(code)
  if (!room) throw new ApiError(404, "Không tìm thấy phòng")
  if (room.phase !== "filtering") {
    throw new ApiError(409, "Phòng đã chuyển sang bình chọn hoặc đã chốt quán")
  }

  const place = await prisma.place.findFirst({
    where: { id: placeId, publishedAt: { not: null }, deletedAt: null },
    select: { id: true },
  })
  if (!place) throw new ApiError(404, "Không tìm thấy địa điểm")

  const existing = await prisma.roomCandidate.findUnique({
    where: { roomId_placeId: { roomId: room.id, placeId } },
    select: { id: true },
  })
  if (existing) return findRoomByCode(code)

  await prisma.$transaction(async (tx) => {
    // Khóa hàng phòng để tránh race condition khi 2 thành viên cùng thêm ứng viên thứ 15.
    const locked = await tx.$queryRaw<{ phase: string }[]>`
      SELECT phase FROM rooms WHERE id = ${room.id}::uuid FOR UPDATE
    `
    if (!locked[0] || locked[0].phase !== "filtering") {
      throw new ApiError(409, "Phòng đã chuyển sang bình chọn hoặc đã chốt quán")
    }
    const alreadyAdded = await tx.roomCandidate.findUnique({
      where: { roomId_placeId: { roomId: room.id, placeId } },
      select: { id: true },
    })
    if (alreadyAdded) return

    const count = await tx.roomCandidate.count({ where: { roomId: room.id } })
    if (count >= MAX_ROOM_CANDIDATES) {
      throw new ApiError(400, `Mỗi phòng chỉ chọn tối đa ${MAX_ROOM_CANDIDATES} quán ứng viên`)
    }

    await tx.roomCandidate.create({
      data: { roomId: room.id, placeId, addedByMemberId: memberId },
    })
    await tx.room.update({
      where: { id: room.id },
      data: { version: { increment: 1 } },
    })
  })

  const updated = await findRoomByCode(code)
  if (updated) publishRoom(code)
  return updated
}

export async function removeRoomCandidate(
  code: string,
  candidateId: string,
  actor?: { memberId: string; isOwner: boolean },
) {
  const room = await findRoomByCode(code)
  if (!room) throw new ApiError(404, "Không tìm thấy phòng")
  if (room.phase !== "filtering") {
    throw new ApiError(409, "Chỉ có thể sửa danh sách ứng viên ở pha lọc")
  }

  await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ phase: string }[]>`
      SELECT phase FROM rooms WHERE id = ${room.id}::uuid FOR UPDATE
    `
    if (!locked[0] || locked[0].phase !== "filtering") {
      throw new ApiError(409, "Chỉ có thể sửa danh sách ứng viên ở pha lọc")
    }
    const candidate = await tx.roomCandidate.findFirst({
      where: { id: candidateId, roomId: room.id },
      select: { id: true, addedByMemberId: true },
    })
    if (!candidate) throw new ApiError(404, "Không tìm thấy ứng viên")
    if (actor && candidate.addedByMemberId !== actor.memberId && !actor.isOwner) {
      throw new ApiError(403, "Chỉ người đề cử hoặc chủ phòng mới được xóa ứng viên này")
    }

    const deleted = await tx.roomCandidate.deleteMany({
      where: { id: candidateId, roomId: room.id },
    })
    if (deleted.count === 0) throw new ApiError(404, "Không tìm thấy ứng viên")

    await tx.room.update({
      where: { id: room.id },
      data: { version: { increment: 1 } },
      select: { version: true },
    })
  })
  publishRoom(code)
  return findRoomByCode(code)
}

export async function startRoomVoting(
  code: string,
  ownerId: string,
  votingMode: RoomVotingMode,
  votingDeadlineAt?: string,
) {
  const room = await findRoomByCode(code)
  if (!room) throw new ApiError(404, "Không tìm thấy phòng")
  if (room.ownerId !== ownerId) {
    throw new ApiError(403, "Chỉ chủ phòng mới có thể bắt đầu bình chọn")
  }
  if (room.phase !== "filtering") {
    throw new ApiError(409, "Phòng đã bắt đầu bình chọn hoặc đã chốt")
  }

  const candidates = await prisma.roomCandidate.findMany({
    where: { roomId: room.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, placeId: true },
  })
  const minRequired = votingMode === "random_wheel" ? 1 : 2
  if (candidates.length < minRequired) {
    throw new ApiError(400, `Cần ít nhất ${minRequired} quán ứng viên để bắt đầu`)
  }

  if (votingMode === "random_wheel") {
    const picked = candidates[randomInt(0, candidates.length)]!
    const res = await prisma.room.updateMany({
      where: { id: room.id, version: room.version, phase: "filtering" },
      data: {
        phase: "locked",
        votingMode,
        winnerPlaceId: picked.placeId,
        lockedAt: new Date(),
        version: room.version + 1,
      },
    })
    if (res.count === 0) throw new ApiError(409, "Trạng thái phòng đã thay đổi, thử lại")
    publishRoom(code)
    return findRoomByCode(code)
  }

  const res = await prisma.room.updateMany({
    where: { id: room.id, version: room.version, phase: "filtering" },
    data: {
      phase: "voting",
      votingMode,
      votingDeadlineAt: votingDeadlineAt ? new Date(votingDeadlineAt) : null,
      version: room.version + 1,
    },
  })
  if (res.count === 0) throw new ApiError(409, "Trạng thái phòng đã thay đổi, thử lại")
  publishRoom(code)
  return findRoomByCode(code)
}

export async function castRoomVote(code: string, memberId: string, input: CastRoomVoteInput) {
  const room = await findRoomByCode(code)
  if (!room) throw new ApiError(404, "Không tìm thấy phòng")
  if (room.phase !== "voting") {
    throw new ApiError(409, "Phòng hiện không ở pha bình chọn")
  }
  if (room.votingDeadlineAt && room.votingDeadlineAt.getTime() < Date.now()) {
    throw new ApiError(409, "Đã hết thời gian bình chọn")
  }
  if (room.votingMode !== input.mode) {
    throw new ApiError(400, "Chế độ bình chọn không khớp với phòng")
  }

  const candidateIds = new Set(
    (
      await prisma.roomCandidate.findMany({
        where: { roomId: room.id },
        select: { id: true },
      })
    ).map((c) => c.id),
  )

  if (input.mode === "swipe_match") {
    if (!candidateIds.has(input.candidateId)) {
      throw new ApiError(404, "Ứng viên không thuộc phòng này")
    }
    await prisma.$transaction([
      prisma.roomVote.upsert({
        where: {
          roomId_candidateId_memberId: {
            roomId: room.id,
            candidateId: input.candidateId,
            memberId,
          },
        },
        create: {
          roomId: room.id,
          candidateId: input.candidateId,
          memberId,
          decision: input.decision,
        },
        update: { decision: input.decision },
      }),
      prisma.room.update({
        where: { id: room.id },
        data: { version: { increment: 1 } },
      }),
    ])
  } else {
    for (const r of input.rankings) {
      if (!candidateIds.has(r.candidateId)) {
        throw new ApiError(404, "Ứng viên không thuộc phòng này")
      }
    }
    await prisma.$transaction([
      prisma.roomVote.deleteMany({ where: { roomId: room.id, memberId } }),
      prisma.roomVote.createMany({
        data: input.rankings.map((r) => ({
          roomId: room.id,
          candidateId: r.candidateId,
          memberId,
          rank: r.rank,
        })),
      }),
      prisma.room.update({
        where: { id: room.id },
        data: { version: { increment: 1 } },
      }),
    ])
  }

  const updated = await findRoomByCode(code)
  if (updated) publishRoom(code)
  return updated
}

export async function finalizeRoomVoting(code: string, ownerId: string, explicitPlaceId?: string) {
  const room = await findRoomByCode(code)
  if (!room) throw new ApiError(404, "Không tìm thấy phòng")
  if (room.ownerId !== ownerId) {
    throw new ApiError(403, "Chỉ chủ phòng mới có thể chốt quán")
  }
  if (room.phase !== "voting") {
    throw new ApiError(409, "Phòng không ở trạng thái đang bình chọn")
  }

  const candidates = await prisma.roomCandidate.findMany({
    where: { roomId: room.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, placeId: true },
  })
  if (candidates.length === 0) throw new ApiError(400, "Chưa có ứng viên nào")

  let winnerPlaceId = explicitPlaceId
  if (winnerPlaceId) {
    if (!candidates.some((c) => c.placeId === winnerPlaceId)) {
      throw new ApiError(400, "Quán được chọn không nằm trong danh sách ứng viên")
    }
  } else {
    const votes = await prisma.roomVote.findMany({
      where: { roomId: room.id },
      select: { candidateId: true, memberId: true, decision: true, rank: true },
    })

    if (room.votingMode === "ranked_choice") {
      const byMember = new Map<string, Array<{ candidateId: string; rank: number }>>()
      for (const v of votes) {
        if (v.rank == null) continue
        const arr = byMember.get(v.memberId) ?? []
        arr.push({ candidateId: v.candidateId, rank: v.rank })
        byMember.set(v.memberId, arr)
      }
      const ballots: RankedBallot[] = [...byMember.entries()].map(([memberId, list]) => ({
        memberId,
        choices: list.sort((a, b) => a.rank - b.rank).map((x) => x.candidateId),
      }))
      const winnerCandidateId = computeInstantRunoffWinner(
        candidates.map((c) => c.id),
        ballots,
      )
      winnerPlaceId =
        candidates.find((c) => c.id === winnerCandidateId)?.placeId ?? candidates[0]!.placeId
    } else {
      const likes = new Map<string, number>()
      for (const v of votes) {
        if (v.decision === "like") likes.set(v.candidateId, (likes.get(v.candidateId) ?? 0) + 1)
      }
      const sorted = [...candidates].sort((a, b) => (likes.get(b.id) ?? 0) - (likes.get(a.id) ?? 0))
      winnerPlaceId = sorted[0]!.placeId
    }
  }

  const res = await prisma.room.updateMany({
    where: { id: room.id, version: room.version, phase: "voting" },
    data: {
      phase: "locked",
      winnerPlaceId,
      lockedAt: new Date(),
      version: room.version + 1,
    },
  })
  if (res.count === 0) throw new ApiError(409, "Trạng thái phòng đã thay đổi, thử lại")

  publishRoom(code)
  return findRoomByCode(code)
}
