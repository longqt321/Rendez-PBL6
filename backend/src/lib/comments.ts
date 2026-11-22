import { prisma } from "./prisma"
import { formatInitials } from "./profile"

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

function buildCommentInclude(viewerId: string | null) {
  return {
    author: { select: { name: true, handle: true } },
    parent: {
      select: {
        deletedAt: true,
        author: { select: { handle: true } },
      },
    },
    _count: { select: { likes: true } },
    likes: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
  } as const
}

type PrismaCommentRecord = {
  id: string
  postId: string
  parentId: string | null
  body: string
  createdAt: Date
  authorId: string
  author: { name: string; handle: string }
  parent: { deletedAt: Date | null; author: { handle: string } } | null
  _count: { likes: number }
  likes?: { userId: string }[]
}

function toCommentRow(record: PrismaCommentRecord): CommentRow {
  return {
    id: record.id,
    post_id: record.postId,
    parent_id: record.parentId,
    body: record.body,
    created_at: record.createdAt,
    author_id: record.authorId,
    author_name: record.author.name,
    author_handle: record.author.handle,
    parent_handle: record.parent?.author.handle ?? null,
    parent_deleted: record.parent ? record.parent.deletedAt !== null : false,
    like_count: record._count.likes,
    liked_by_me: Array.isArray(record.likes) && record.likes.length > 0,
  }
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

export type CommentSort = "new" | "top"

export function parseCommentSort(raw: string | undefined): CommentSort {
  return raw === "top" ? "top" : "new"
}

/**
 * Toàn bộ bình luận còn sống của một bài — đủ để xếp hạng + ghép reply ở JS.
 */
export async function listCommentsForPost(
  postId: string,
  viewerId: string | null,
  sort: CommentSort = "new",
  limit?: number,
): Promise<CommentDto[]> {
  const records = await prisma.comment.findMany({
    where: { postId, deletedAt: null },
    include: buildCommentInclude(viewerId),
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })
  const rows = records.map((record) => toCommentRow(record as PrismaCommentRecord))

  const byParent = new Map<string | null, CommentRow[]>()
  for (const row of rows) {
    const list = byParent.get(row.parent_id) ?? []
    list.push(row)
    byParent.set(row.parent_id, list)
  }

  const topLevel = byParent.get(null) ?? []
  if (sort === "top") {
    topLevel.sort(
      (a, b) =>
        Number(b.like_count) - Number(a.like_count) ||
        b.created_at.getTime() - a.created_at.getTime(),
    )
  } else {
    topLevel.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
  }

  const items: CommentDto[] = []
  for (const parent of topLevel) {
    items.push(toCommentDto(parent, viewerId))
    const replies = byParent.get(parent.id) ?? []
    replies.sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
    for (const reply of replies) items.push(toCommentDto(reply, viewerId))
  }
  return limit === undefined ? items : items.slice(0, limit)
}

/** Bình luận còn sống theo id — `null` khi không tồn tại/đã xoá. */
export async function findComment(id: string, viewerId: string | null): Promise<CommentDto | null> {
  const record = await prisma.comment.findFirst({
    where: { id, deletedAt: null },
    include: buildCommentInclude(viewerId),
  })
  return record ? toCommentDto(toCommentRow(record as PrismaCommentRecord), viewerId) : null
}
