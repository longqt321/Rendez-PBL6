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

interface CompiledCriterion {
  readonly memberId: string
  readonly memberName: string
  readonly proposalId: string
  readonly evaluate: (place: Place) => boolean
  readonly conflictReason: string
}

function categoryLabel(value: string): string {
  return CATEGORY_META[value as PlaceCategory]?.label ?? value
}

function matchesPlaceKeyword(place: Place, rawKeyword: string): boolean {
  const needle = normalizeQueryText(rawKeyword)
  if (!needle) return true
  const haystack = normalizeQueryText(
    `${place.name} ${place.address} ${place.district ?? ""} ${place.tags.join(" ")}`,
  )
  return haystack.includes(needle)
}

function formatSingleConflict(proposal: RoomProposal): string {
  const isExclude = proposal.kind === "exclude"
  if (proposal.field === "category") {
    const label = categoryLabel(proposal.value)
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

function evaluateSingleProposal(place: Place, proposal: RoomProposal): boolean {
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
    if (!Number.isFinite(maxLevel) || place.priceLevel == null) return true
    return place.priceLevel <= maxLevel
  }
  const hasKeyword = matchesPlaceKeyword(place, proposal.value)
  return isExclude ? !hasKeyword : hasKeyword
}

/**
 * Biên dịch danh sách đề xuất thành các tiêu chí đánh giá hợp lệ:
 * - Trong phạm vi CÙNG 1 thành viên, nhiều `include` trên `category` hoặc `district`
 *   được gom thành phép HOẶC (OR) để tránh báo mâu thuẫn giả.
 * - Mỗi thành viên chỉ giữ 1 mức `priceMax` (mới nhất).
 * - Các tiêu chí `exclude` và `include` từ khoá kiểm tra độc lập.
 */
function compileRoomCriteria(
  activeProposals: readonly RoomProposal[],
  memberMap: ReadonlyMap<string, RoomMember>,
): CompiledCriterion[] {
  const byMember = new Map<string, RoomProposal[]>()
  for (const proposal of activeProposals) {
    const list = byMember.get(proposal.memberId) ?? []
    list.push(proposal)
    byMember.set(proposal.memberId, list)
  }

  const criteria: CompiledCriterion[] = []

  for (const [memberId, list] of byMember.entries()) {
    const memberName = memberMap.get(memberId)?.displayName ?? "Thành viên"

    const includeCategories = list.filter((p) => p.kind === "include" && p.field === "category")
    const firstIncludeCategory = includeCategories[0]
    if (firstIncludeCategory) {
      const allowed = new Set(includeCategories.map((p) => p.value))
      const labels = Array.from(allowed).map(categoryLabel)
      criteria.push({
        memberId,
        memberName,
        proposalId: firstIncludeCategory.id,
        evaluate: (place) => allowed.has(place.category),
        conflictReason:
          labels.length === 1
            ? `Muốn loại hình ${labels[0]}`
            : `Muốn loại hình ${labels.join(" hoặc ")}`,
      })
    }

    const includeDistricts = list.filter((p) => p.kind === "include" && p.field === "district")
    const firstIncludeDistrict = includeDistricts[0]
    if (firstIncludeDistrict) {
      const normalizedAllowed = new Set(includeDistricts.map((p) => normalizeQueryText(p.value)))
      const labels = Array.from(new Set(includeDistricts.map((p) => p.value)))
      criteria.push({
        memberId,
        memberName,
        proposalId: firstIncludeDistrict.id,
        evaluate: (place) => {
          const d = normalizeQueryText(place.district ?? "")
          return d.length > 0 && normalizedAllowed.has(d)
        },
        conflictReason:
          labels.length === 1 ? `Muốn ở quận ${labels[0]}` : `Muốn ở quận ${labels.join(" hoặc ")}`,
      })
    }

    const includePrices = list.filter((p) => p.kind === "include" && p.field === "priceMax")
    const latestPrice = includePrices[0]
    if (latestPrice) {
      // proposals đã sắp createdAt desc từ backend -> phần tử đầu là mức mới nhất
      criteria.push({
        memberId,
        memberName,
        proposalId: latestPrice.id,
        evaluate: (place) => evaluateSingleProposal(place, latestPrice),
        conflictReason: formatSingleConflict(latestPrice),
      })
    }

    for (const proposal of list) {
      const isGroupedInclude =
        proposal.kind === "include" &&
        (proposal.field === "category" ||
          proposal.field === "district" ||
          proposal.field === "priceMax")
      if (isGroupedInclude) continue
      criteria.push({
        memberId,
        memberName,
        proposalId: proposal.id,
        evaluate: (place) => evaluateSingleProposal(place, proposal),
        conflictReason: formatSingleConflict(proposal),
      })
    }
  }

  return criteria
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

function fairDistanceScore(item: ScoredCandidate): number {
  if (item.avgDistanceKm === null || item.maxDistanceKm === null) {
    return Number.POSITIVE_INFINITY
  }
  return item.avgDistanceKm * 0.6 + item.maxDistanceKm * 0.4
}

export function scoreAndRankRoomCandidates(room: Room): ScoredCandidate[] {
  const memberMap = new Map(room.members.map((m) => [m.id, m]))
  const activeProposals = room.proposals.filter((p) => p.status !== "dismissed")
  const criteria = compileRoomCriteria(activeProposals, memberMap)

  const scored = room.candidates.map((candidate): ScoredCandidate => {
    const conflicts: ProposalConflict[] = []
    let satisfiedCount = 0

    for (const criterion of criteria) {
      if (criterion.evaluate(candidate.place)) {
        satisfiedCount += 1
      } else {
        conflicts.push({
          memberId: criterion.memberId,
          memberName: criterion.memberName,
          proposalId: criterion.proposalId,
          reason: criterion.conflictReason,
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
      totalCriteriaCount: criteria.length,
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
    return fairDistanceScore(a) - fairDistanceScore(b)
  })
}
