import type { PlaceSummary } from "./place"

export interface Author {
  id: string
  name: string
  handle: string
  initials: string
  avatarUrl?: string | null
}

export interface Post {
  id: string
  author: Author
  caption: string
  pinnedAt: string | null
  createdAt: string

  placeId: string | null

  place: PlaceSummary | null
  likeCount: number
  commentCount: number
  likedByMe: boolean
  savedByMe: boolean

  images: string[]
}

export interface UpdatePostInput {
  caption?: string
  pinned?: boolean
}

export interface CreatePostInput {
  caption: string
  placeId: string | null

  images?: string[]
}

export type PostFeedFilter = "all" | "unplaced" | "mine" | "saved" | "following"
