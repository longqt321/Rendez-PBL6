import { z } from "zod"
import { placeSchema } from "./place.schema"
import type {
  Room,
  RoomCandidate,
  RoomFilter,
  RoomMember,
  RoomPhase,
  RoomProposal,
  RoomVoteSummary,
  RoomVotingMode,
  RoomVotingProgress,
} from "./types/room"

const placeCategoryEnum = z.enum([
  "cafe",
  "restaurant",
  "street-food",
  "bakery",
  "dessert",
  "bar",
])

export const roomPhaseSchema = z.enum([
  "filtering",
  "voting",
  "locked",
]) satisfies z.ZodType<RoomPhase>

export const roomVotingModeSchema = z.enum([
  "swipe_match",
  "ranked_choice",
  "random_wheel",
]) satisfies z.ZodType<RoomVotingMode>

export const roomMemberSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  locationLabel: z.string().nullable().optional(),
  isMe: z.boolean(),
  isOwner: z.boolean().optional(),
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

export const roomCandidateSchema = z.object({
  id: z.string(),
  placeId: z.string(),
  addedByMemberId: z.string(),
  place: placeSchema,
  createdAt: z.string(),
}) satisfies z.ZodType<RoomCandidate>

export const roomVoteSummarySchema = z.object({
  candidateId: z.string(),
  likeCount: z.number().int().min(0),
  passCount: z.number().int().min(0),
  myDecision: z.enum(["like", "pass"]).optional(),
  myRank: z.number().int().min(1).max(3).optional(),
}) satisfies z.ZodType<RoomVoteSummary>

export const roomVotingProgressSchema = z.object({
  votedMemberIds: z.array(z.string()),
  totalActiveMembers: z.number().int().min(0),
  matchedCandidateIds: z.array(z.string()),
}) satisfies z.ZodType<RoomVotingProgress>

export const roomSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  phase: roomPhaseSchema,
  votingMode: roomVotingModeSchema,
  votingDeadlineAt: z.string().nullable().optional(),
  winnerPlaceId: z.string().nullable().optional(),
  lockedAt: z.string().nullable().optional(),
  members: z.array(roomMemberSchema),
  proposals: z.array(roomProposalSchema),
  candidates: z.array(roomCandidateSchema),
  voteSummaries: z.array(roomVoteSummarySchema),
  votingProgress: roomVotingProgressSchema,
  filter: roomFilterSchema,
  createdAt: z.string(),
}) satisfies z.ZodType<Room>

export const appliedProposalSchema = z.object({
  room: roomSchema,
  summary: z.string(),
})

export const createRoomInputSchema = z.object({
  name: z.string().trim().max(80).optional(),
})

export const createRoomResponseSchema = roomSchema.extend({
  guestToken: z.string(),
})

export const joinRoomInputSchema = z.object({
  displayName: z.string().trim().min(1, "Tên hiển thị trống").max(40),
})

export const joinRoomResponseSchema = z.object({
  room: roomSchema,
  memberId: z.string(),
  joined: z.boolean(),
  guestToken: z.string().optional(),
})

export const createProposalInputSchema = z.object({
  kind: z.enum(["include", "exclude"]),
  field: z.enum(["category", "district", "priceMax", "keyword"]),
  value: z.string().trim().min(1, "Giá trị đề xuất trống").max(80),
  autoApply: z.boolean().optional(),
})

export const roomFilterTargetSchema = z.object({
  kind: z.enum(["include", "exclude"]),
  field: z.enum(["category", "district", "priceMax", "keyword"]),
  value: z.string().trim().min(1, "Giá trị lọc trống").max(80),
})

export const updateRoomFilterInputSchema = z.union([
  z.object({
    action: z.literal("reset"),
  }),
  z.object({
    action: z.enum(["remove", "toggle"]),
    kind: z.enum(["include", "exclude"]),
    field: z.enum(["category", "district", "priceMax", "keyword"]),
    value: z.string().trim().min(1, "Giá trị lọc trống").max(80),
  }),
  z.object({
    action: z.literal("replace"),
    items: z.array(roomFilterTargetSchema).max(20),
  }),
])

export const addRoomCandidateInputSchema = z.object({
  placeId: z.string().trim().min(1),
})

export const startRoomVotingInputSchema = z.object({
  votingMode: roomVotingModeSchema,
  votingDeadlineAt: z.string().datetime().optional(),
})

export const castRoomVoteInputSchema = z.union([
  z.object({
    mode: z.literal("swipe_match"),
    candidateId: z.string().uuid(),
    decision: z.enum(["like", "pass"]),
  }),
  z.object({
    mode: z.literal("ranked_choice"),
    rankings: z
      .array(
        z.object({
          candidateId: z.string().uuid(),
          rank: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        }),
      )
      .min(1)
      .max(3),
  }),
])

export const finalizeRoomVotingInputSchema = z.object({
  winnerPlaceId: z.string().trim().min(1).optional(),
})

export const updateRoomMemberLocationInputSchema = z.object({
  lat: z.number().finite().min(-90).max(90).nullable(),
  lng: z.number().finite().min(-180).max(180).nullable(),
  locationLabel: z.string().trim().max(80).nullable().optional(),
})

export const roomSummarySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  phase: roomPhaseSchema,
  memberCount: z.number().int().min(0),
  candidateCount: z.number().int().min(0),
  winnerPlaceId: z.string().nullable().optional(),
  createdAt: z.string(),
})

export type CreateProposalInput = z.infer<typeof createProposalInputSchema>
export type UpdateRoomFilterInput = z.infer<typeof updateRoomFilterInputSchema>
export type AddRoomCandidateInput = z.infer<typeof addRoomCandidateInputSchema>
export type StartRoomVotingInput = z.infer<typeof startRoomVotingInputSchema>
export type CastRoomVoteInput = z.infer<typeof castRoomVoteInputSchema>
export type FinalizeRoomVotingInput = z.infer<typeof finalizeRoomVotingInputSchema>
export type UpdateRoomMemberLocationInput = z.infer<typeof updateRoomMemberLocationInputSchema>
