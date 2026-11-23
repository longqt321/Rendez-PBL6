import distance from "@turf/distance"
import { point } from "@turf/helpers"
import { normalizeQueryText } from "@rendez/schema"
import { CATEGORY_META } from "@/features/places/lib/category-meta"
import { priceLevelLabel } from "@/features/places/lib/price-level"
import type { Place, PlaceCategory } from "@/features/places/types/place"
import type { Room, RoomCandidate, RoomMember, RoomProposal } from "../types/room"

export interface ProposalConflict {
  readonly memberId: string
  readonly memberName: string
  readonly proposalId: string
  readonly reason: string
}

export interface MemberDistance {
  readonly memberId: string
  readonly displayName: string
  readonly isMe: boolean
  readonly distanceKm: number
}

export interface ScoredCandidate {
  readonly candidate: RoomCandidate
  readonly satisfiedCount: number
  readonly totalCriteriaCount: number
  readonly conflicts: readonly ProposalConflict[]
  readonly distances: readonly MemberDistance[]
  readonly avgDistanceKm: number | null
  readonly maxDistanceKm: number | null
}

function formatProposalLabel(proposal: RoomProposal): string {
  const isExclude = proposal.kind === "exclude"
  if (proposal.field === "category") {
    const label = CATEGORY_META[proposal.value as PlaceCategory]?.label ?? proposal.value
    return isExclude ? `Tránh loại hình ${label}` : `Muốn loại hình ${label}`
  }
  if (proposal.field === "district") {
    return isExclude ? `Tránh quận ${proposal.value}` : `Muốn ở quận ${proposal.value}`
  }
  if (proposal.field === "priceMax") {
    const level = Number(proposal.value) as 1 | 2 | 3
    return `Vượt ngân sách (${priceLevelLabel(level)} trở xuống)`
  }
  return isExclude ? `Tránh “${proposal.value}”` : `Thiếu từ khóa “${proposal.value}”`
}

function matchesPlaceKeyword(place: Place, rawKeyword: string): boolean {
  const needle = normalizeQueryText(rawKeyword)
  if (!needle) return true
  const haystack = normalizeQueryText(
    `${place.name} ${place.address} ${place.district ?? ""} ${place.tags.join(" ")}`,
  )
  return haystack.includes(needle)
}

function evaluateProposal(place: Place, proposal: RoomProposal): boolean {
  const isExclude = proposal.kind === "exclude"
  if (proposal.field === "category") {
    const match = place.category === proposal.value
    return isExclude ? !match : match
  }
  if (proposal.field === "district") {
    const placeDistrict = normalizeQueryText(place.district ?? "")
    const targetDistrict = normalizeQueryText(proposal.value)
    const match = placeDistrict.length > 0 && placeDistrict === targetDistrict
    return isExclude ? !match : match
  }
  if (proposal.field === "priceMax") {
    const maxLevel = Number(proposal.value)
    if (!Number.isFinite(maxLevel)) return true
    return place.priceLevel <= maxLevel
  }
  const hasKeyword = matchesPlaceKeyword(place, proposal.value)
  return isExclude ? !hasKeyword : hasKeyword
}

function computeMemberDistances(place: Place, members: readonly RoomMember[]): MemberDistance[] {
  if (place.lat == null || place.lng == null) return []
  const toPt = point([place.lng, place.lat])
  const results: MemberDistance[] = []
  for (const member of members) {
    if (member.lat == null || member.lng == null) continue
    const fromPt = point([member.lng, member.lat])
    const km = distance(fromPt, toPt, { units: "kilometers" })
    results.push({
      memberId: member.id,
      displayName: member.displayName,
      isMe: member.isMe,
      distanceKm: Math.round(km * 10) / 10,
    })
  }
  return results
}

export function scoreAndRankRoomCandidates(room: Room): ScoredCandidate[] {
  const memberMap = new Map(room.members.map((m) => [m.id, m]))
  const activeProposals = room.proposals.filter((p) => p.status !== "dismissed")

  const scored = room.candidates.map((candidate): ScoredCandidate => {
    const conflicts: ProposalConflict[] = []
    let satisfiedCount = 0

    for (const proposal of activeProposals) {
      const ok = evaluateProposal(candidate.place, proposal)
      if (ok) {
        satisfiedCount += 1
      } else {
        const owner = memberMap.get(proposal.memberId)
        conflicts.push({
          memberId: proposal.memberId,
          memberName: owner?.displayName ?? "Thành viên",
          proposalId: proposal.id,
          reason: formatProposalLabel(proposal),
        })
      }
    }

    const distances = computeMemberDistances(candidate.place, room.members)
    const avgDistanceKm =
      distances.length > 0
        ? Math.round(
            (distances.reduce((sum, item) => sum + item.distanceKm, 0) / distances.length) * 10,
          ) / 10
        : null
    const maxDistanceKm =
      distances.length > 0 ? Math.max(...distances.map((item) => item.distanceKm)) : null

    return {
      candidate,
      satisfiedCount,
      totalCriteriaCount: activeProposals.length,
      conflicts,
      distances,
      avgDistanceKm,
      maxDistanceKm,
    }
  })

  return scored.sort((a, b) => {
    if (a.conflicts.length !== b.conflicts.length) {
      return a.conflicts.length - b.conflicts.length
    }
    if (a.satisfiedCount !== b.satisfiedCount) {
      return b.satisfiedCount - a.satisfiedCount
    }
    const aDist = a.avgDistanceKm ?? Number.POSITIVE_INFINITY
    const bDist = b.avgDistanceKm ?? Number.POSITIVE_INFINITY
    return aDist - bDist
  })
}
