import type { Place, PlaceCategory } from "./place"

export type RoomPhase = "filtering" | "voting" | "locked"

export type RoomVotingMode = "swipe_match" | "ranked_choice" | "random_wheel"

export interface RoomMember {
  id: string
  displayName: string

  isMe: boolean
  joinedAt: string
}

export type RoomProposalField = "category" | "district" | "priceMax" | "keyword"

export interface RoomProposal {
  id: string
  memberId: string
  kind: "include" | "exclude"
  field: RoomProposalField

  value: string
  status: "open" | "applied" | "dismissed"
  createdAt: string
}

export interface RoomFilter {
  categories: PlaceCategory[]
  excludedCategories: PlaceCategory[]
  districts: string[]
  excludedDistricts: string[]
  includeKeywords: string[]
  excludeKeywords: string[]
  priceMax?: 1 | 2 | 3
}

export interface RoomCandidate {
  id: string
  placeId: string
  addedByMemberId: string
  place: Place
  createdAt: string
}

export interface RoomVoteSummary {
  candidateId: string
  likeCount: number
  passCount: number
  myDecision?: "like" | "pass"
  myRank?: number
}

export interface RoomVotingProgress {
  votedMemberIds: string[]
  totalActiveMembers: number
  matchedCandidateIds: string[]
}

export interface Room {
  id: string

  code: string
  name: string
  phase: RoomPhase
  votingMode: RoomVotingMode
  votingDeadlineAt?: string | null
  winnerPlaceId?: string | null
  lockedAt?: string | null
  members: RoomMember[]
  proposals: RoomProposal[]
  candidates: RoomCandidate[]
  voteSummaries: RoomVoteSummary[]
  votingProgress: RoomVotingProgress
  filter: RoomFilter
  createdAt: string
}

export interface AppliedProposalResult {
  room: Room
  summary: string
}
