import type { PlaceSummary } from "./place"

export interface Author {
  id: string
  name: string
  handle: string

  initials: string
}

export interface Post {
  id: string
  author: Author
  caption: string
  createdAt: string

  placeId: string | null

  place: PlaceSummary | null
  likeCount: number
  commentCount: number
  likedByMe: boolean
  savedByMe: boolean

  images: string[]
}

export interface CreatePostInput {
  caption: string
  placeId: string | null

  images?: string[]
}

export type PostFeedFilter = "all" | "unplaced" | "mine" | "saved" | "following"
