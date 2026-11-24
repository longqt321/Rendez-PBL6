import type { Place } from "./place"
import type { Author } from "./post"

export interface Collection {
  id: string
  name: string
  description: string
  isPrivate: boolean
  owner: Author

  placeIds: string[]
  places?: Place[]
  createdAt: string
  isMine: boolean

  likeCount: number

  likedByMe: boolean
}

export interface CollectionSummary {
  id: string
  name: string
  description: string
  isPrivate: boolean
  placeCount: number

  previewPlaceIds: string[]
  createdAt: string

  containsPlace?: boolean
  likeCount: number
  likedByMe: boolean
}
