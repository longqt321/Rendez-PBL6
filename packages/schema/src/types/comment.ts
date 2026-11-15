import type { Author } from "./post"

export interface Comment {
  id: string
  postId: string
  author: Author
  body: string
  createdAt: string
  likeCount: number
  likedByMe: boolean

  isMine: boolean

  parentId: string | null

  replyTo: { commentId: string; handle: string } | null
}

export type CommentSort = "new" | "top"

export interface CreateCommentInput {
  body: string
  parentId: string | null
}
