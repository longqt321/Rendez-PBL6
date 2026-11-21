import type { Author, Post } from "@/features/social/types/post"
import type { PlaceReport } from "@/features/places/types/place-report"
import type { RoomFilter, RoomProposal } from "@/features/rooms/types/room"

export type MockPost = Omit<Post, "place">

export interface MockComment {
  id: string
  postId: string
  author: Author
  body: string
  createdAt: string
  likeCount: number
  likedByMe: boolean
  parentId: string | null
  deleted: boolean
}

export type MockCommentSeed = Omit<MockComment, "deleted">

export interface MockReview {
  id: string
  placeId: string
  author: Author

  rating: number

  content: string
  createdAt: string
}

export type MockReviewSeed = MockReview

export type MockReport = PlaceReport & {
  reporterId: string
  status?: "pending" | "reviewed" | "dismissed"
  updatedAt?: string
}

export interface MockCollection {
  id: string
  name: string
  description: string
  isPrivate: boolean
  owner: Author
  placeIds: string[]
  createdAt: string

  likeCount: number

  likedByMe: boolean
}

export interface MockRoomMember {
  id: string
  displayName: string
  joinedAt: string

  userId: string | null
}

export interface MockRoom {
  id: string
  code: string
  name: string
  members: MockRoomMember[]
  proposals: RoomProposal[]
  filter: RoomFilter
  createdAt: string
}
