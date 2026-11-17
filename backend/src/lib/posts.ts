import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"
import { toApiCategory } from "./enums"
import type { Cursor } from "./cursor"
import { formatInitials } from "./profile"

export type PostFilter = "all" | "unplaced" | "mine" | "saved" | "following"

export interface PostRow {
  id: string
  caption: string
  created_at: Date
  place_id: string | null
  author_id: string
  author_name: string
  author_handle: string
  place_name: string | null
  place_address: string | null
  place_district: string | null
  place_category: string | null
  place_lat: number | null
  place_lng: number | null
  place_published_at: Date | null
  place_image_url: string | null
  like_count: number
  comment_count: number
  liked_by_me: boolean
  saved_by_me: boolean

  images: string[] | string | null
}

export function toPostDto(row: PostRow) {
  return {
    id: row.id,
    author: {
      id: row.author_id,
      name: row.author_name,
      handle: row.author_handle,
      initials: formatInitials(row.author_name),
    },
    caption: row.caption,
    createdAt: row.created_at.toISOString(),
    placeId: row.place_id,
    place:
      row.place_id === null || row.place_name === null
        ? null
        : {
            id: row.place_id,
            name: row.place_name,
            address: row.place_address ?? "",
            ...(row.place_district ? { district: row.place_district } : {}),
            category: toApiCategory(row.place_category ?? "restaurant"),
            ...(row.place_image_url ? { imageUrl: row.place_image_url } : {}),
            isPublished: row.place_published_at !== null,
            ...(row.place_lat !== null ? { lat: row.place_lat } : {}),
            ...(row.place_lng !== null ? { lng: row.place_lng } : {}),
          },
    likeCount: Number(row.like_count),
    commentCount: Number(row.comment_count),
    likedByMe: row.liked_by_me,
    savedByMe: row.saved_by_me,
    images: parseImages(row.images),
  }
}

function parseImages(value: PostRow["images"]): string[] {
  if (Array.isArray(value)) {
    return value.filter((url): url is string => typeof url === "string")
  }
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value)
      return Array.isArray(parsed)
        ? parsed.filter((url): url is string => typeof url === "string")
        : []
    } catch {
      return []
    }
  }
  return []
}

export type PostDto = ReturnType<typeof toPostDto>

function selectPosts(viewerId: string | null): Prisma.Sql {
  const viewer = Prisma.sql`${viewerId}::uuid`
  return Prisma.sql`
    SELECT p.id, p.caption, p.created_at, p.place_id, p.author_id,
           u.name AS author_name, u.handle AS author_handle,
           pl.name AS place_name, pl.address AS place_address, pl.district AS place_district,
           pl.category::text AS place_category, pl.lat AS place_lat, pl.lng AS place_lng,
           pl.published_at AS place_published_at,
           plimg.url AS place_image_url,
           (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id)::int AS like_count,
           (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL)::int AS comment_count,
           EXISTS (SELECT 1 FROM post_likes l WHERE l.post_id = p.id AND l.user_id = ${viewer}) AS liked_by_me,
           EXISTS (SELECT 1 FROM post_saves s WHERE s.post_id = p.id AND s.user_id = ${viewer}) AS saved_by_me,
           COALESCE(
             (SELECT json_agg(pi.url ORDER BY pi.position, pi.id) FROM post_images pi WHERE pi.post_id = p.id),
             '[]'::json
           ) AS images
    FROM posts p
    JOIN users u ON u.id = p.author_id
    LEFT JOIN places pl ON pl.id = p.place_id
    LEFT JOIN LATERAL (
      SELECT pi.url FROM place_images pi WHERE pi.place_id = pl.id ORDER BY pi.position LIMIT 1
    ) plimg ON true
  `
}

export interface ListPostsParams {
  filter: PostFilter
  q?: string
  viewerId: string | null
  /** Lọc theo tác giả — dùng cho `GET /users/:handle/posts`. */
  authorId?: string
  /** Bài đã lưu bởi user này — tab `saved`/`pinned` của chính chủ (khớp mock). */
  savedOf?: string
  /** Chỉ bài gắn địa điểm này — `GET /places/:id/posts`. */
  placeId?: string
  cursor: Cursor | null
  pageSize: number
}

/** Feed phân trang keyset `(created_at, id)` giảm dần. */
export async function listPosts(
  params: ListPostsParams,
): Promise<{ items: PostDto[]; next: Cursor | null }> {
  const conditions: Prisma.Sql[] = [Prisma.sql`p.deleted_at IS NULL`]

  if (params.filter === "unplaced") conditions.push(Prisma.sql`p.place_id IS NULL`)
  if (params.filter === "mine") conditions.push(Prisma.sql`p.author_id = ${params.viewerId}::uuid`)
  if (params.filter === "saved") {
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM post_saves s WHERE s.post_id = p.id AND s.user_id = ${params.viewerId}::uuid)`,
    )
  }
  if (params.filter === "following") {
    // Bài của người mình theo dõi — EXISTS trên khoá chính (follower_id,
    // following_id) nên không cần index thêm; route đã chặn viewer null.
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ${params.viewerId}::uuid AND f.following_id = p.author_id)`,
    )
  }
  if (params.authorId) conditions.push(Prisma.sql`p.author_id = ${params.authorId}::uuid`)
  if (params.placeId) conditions.push(Prisma.sql`p.place_id = ${params.placeId}`)
  if (params.savedOf) {
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM post_saves s WHERE s.post_id = p.id AND s.user_id = ${params.savedOf}::uuid)`,
    )
  }
  if (params.q) {
    // Chuẩn hoá 2 phía bằng cùng hàm với tìm kiếm địa điểm (migration 10) — mock
    // so khớp trên `normalizeText(caption)` nên `?q=bánh xèo` phải khớp bài có dấu.
    const qPattern = Prisma.sql`'%' || immutable_search_normalize(${params.q}) || '%'`
    conditions.push(Prisma.sql`immutable_search_normalize(p.caption) LIKE ${qPattern}`)
  }
  if (params.cursor) {
    conditions.push(
      Prisma.sql`(p.created_at, p.id) < (${params.cursor.createdAt}::timestamptz, ${params.cursor.id}::uuid)`,
    )
  }

  const rows = await prisma.$queryRaw<PostRow[]>(Prisma.sql`
    ${selectPosts(params.viewerId)}
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT ${params.pageSize + 1}
  `)

  const page = rows.slice(0, params.pageSize)
  const last = page.at(-1)
  return {
    items: page.map(toPostDto),
    next:
      rows.length > params.pageSize && last ? { createdAt: last.created_at, id: last.id } : null,
  }
}

/** Một bài đăng còn sống — `null` khi không tồn tại/đã xoá. */
export async function findPost(id: string, viewerId: string | null): Promise<PostDto | null> {
  const rows = await prisma.$queryRaw<PostRow[]>(Prisma.sql`
    ${selectPosts(viewerId)}
    WHERE p.id = ${id}::uuid AND p.deleted_at IS NULL
    LIMIT 1
  `)
  const row = rows[0]
  return row ? toPostDto(row) : null
}
