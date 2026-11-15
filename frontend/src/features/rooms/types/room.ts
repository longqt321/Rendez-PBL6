import type { PlaceCategory } from "@/features/places/types/place"

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

export interface Room {
  id: string

  code: string
  name: string
  members: RoomMember[]
  proposals: RoomProposal[]
  filter: RoomFilter
  createdAt: string
}

export interface AppliedProposalResult {
  room: Room

  summary: string
}
