import type { Author } from "@/features/social/types/post"

/**
 * Bình luận của một bài đăng.
 *
 * `replyTo` chỉ có khi đây là trả lời bình luận khác (lồng 1 cấp): server nhúng
 * handle của người được trả lời để client render "@handle" mà không phải tự
 * tìm trong danh sách đã tải.
 */
export interface Comment {
  id: string
  postId: string
  author: Author
  body: string
  createdAt: string
  likeCount: number
  likedByMe: boolean
  /** null = bình luận gốc; khác null = trả lời bình luận khác (lồng 1 cấp). */
  parentId: string | null
  /** Thông tin người được trả lời — server nhúng kèm, client không tự tra cứu. */
  replyTo: { commentId: string; handle: string } | null
}

export type CommentSort = "new" | "top"

export interface CreateCommentInput {
  body: string
  parentId: string | null
}
