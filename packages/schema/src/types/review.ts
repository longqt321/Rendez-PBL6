import type { Author } from "./post"

export interface Review {
  id: string
  placeId: string
  author: Author
  rating: number
  content: string
  createdAt: string

  isMine: boolean
}
