import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"
import { formatInitials } from "./profile"

/**
 * Truy vấn bình luận (A7.6) — lồng 1 cấp, xoá mềm.
 *
 * Trả PHẲNG: cha kèm reply ngay sau cha (reply theo thời gian tăng dần) —
 * client không tự ghép cây (A6.7). `replyTo` do server suy ra từ cha, kể cả
 * cha đã xoá mềm → `replyTo: null`.
 */

export interface CommentRow {
  id: string
  post_id: string
  parent_id: string | null
  body: string
  created_at: Date
  author_id: string
  author_name: string
  author_handle: string
  parent_handle: string | null
  parent_deleted: boolean
  like_count: number
  liked_by_me: boolean
}

export function toCommentDto(row: CommentRow, viewerId: string | null) {
  const parentAlive = row.parent_handle !== null && row.parent_deleted === false
  return {
    id: row.id,
    postId: row.post_id,
    author: {
      id: row.author_id,
      name: row.author_name,
      handle: row.author_handle,
      initials: formatInitials(row.author_name),
    },
    body: row.body,
    createdAt: row.created_at.toISOString(),
    likeCount: Number(row.like_count),
    likedByMe: row.liked_by_me,
    isMine: viewerId !== null && viewerId === row.author_id,
    parentId: row.parent_id,
    replyTo:
      row.parent_id === null || !parentAlive
        ? null
        : { commentId: row.parent_id, handle: row.parent_handle },
  }
}

export type CommentDto = ReturnType<typeof toCommentDto>

/** Cách sắp xếp bình luận cấp 1 — khớp mock (`sort=new|top`). */
export type CommentSort = "new" | "top"

/** Chuẩn hoá `?sort=` — giá trị lạ coi như "new" (mock cũng vậy). */
export function parseCommentSort(raw: string | undefined): CommentSort {
  return raw === "top" ? "top" : "new"
}

/** SELECT dùng chung cho list + find — tên cột snake_case như SELECT. */
function selectComments(viewerId: string | null): Prisma.Sql {
  const viewer = Prisma.sql`${viewerId}::uuid`
  return Prisma.sql`
    SELECT c.id, c.post_id, c.parent_id, c.body, c.created_at, c.author_id,
           u.name AS author_name, u.handle AS author_handle,
           parent_u.handle AS parent_handle, parent.deleted_at IS NOT NULL AS parent_deleted,
           (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id)::int AS like_count,
           EXISTS (SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = ${viewer}) AS liked_by_me
    FROM comments c
    JOIN users u ON u.id = c.author_id
    LEFT JOIN comments parent ON parent.id = c.parent_id
    LEFT JOIN users parent_u ON parent_u.id = parent.author_id
  `
}

/** Toàn bộ bình luận còn sống của một bài — đủ để xếp hạng + ghép reply ở JS. */
export async function listCommentsForPost(
  postId: string,
  viewerId: string | null,
  sort: CommentSort = "new",
): Promise<CommentDto[]> {
  const rows = await prisma.$queryRaw<CommentRow[]>(Prisma.sql`
    ${selectComments(viewerId)}
    WHERE c.post_id = ${postId}::uuid AND c.deleted_at IS NULL
    ORDER BY c.created_at ASC, c.id ASC
  `)

  const byParent = new Map<string | null, CommentRow[]>()
  for (const row of rows) {
    const list = byParent.get(row.parent_id) ?? []
    list.push(row)
    byParent.set(row.parent_id, list)
  }

  const topLevel = byParent.get(null) ?? []
  if (sort === "top") {
    // "top": nhiều like trước; hoà thì mới nhất trước (tất định, khớp thứ tự mock).
    topLevel.sort(
      (a, b) =>
        Number(b.like_count) - Number(a.like_count) ||
        b.created_at.getTime() - a.created_at.getTime(),
    )
  } else {
    // Sort "new": cha mới nhất trước (mock so `Date.parse` giảm dần).
    topLevel.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
  }

  const items: CommentDto[] = []
  for (const parent of topLevel) {
    items.push(toCommentDto(parent, viewerId))
    // Reply đi kèm ngay sau cha, theo thời gian tăng dần (A6.7).
    const replies = byParent.get(parent.id) ?? []
    replies.sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
    for (const reply of replies) items.push(toCommentDto(reply, viewerId))
  }
  return items
}

/** Bình luận còn sống theo id — `null` khi không tồn tại/đã xoá. */
export async function findComment(id: string, viewerId: string | null): Promise<CommentDto | null> {
  const rows = await prisma.$queryRaw<CommentRow[]>(Prisma.sql`
    ${selectComments(viewerId)}
    WHERE c.id = ${id}::uuid AND c.deleted_at IS NULL
    LIMIT 1
  `)
  const row = rows[0]
  return row ? toCommentDto(row, viewerId) : null
}
