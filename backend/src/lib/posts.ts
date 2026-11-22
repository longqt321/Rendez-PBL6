import type { Cursor } from "./cursor"
import { toApiCategory } from "./enums"
import { db, sql } from "./kysely"
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

function basePostsQuery(viewerId: string | null) {
  return db
    .selectFrom("posts as p")
    .innerJoin("users as u", "u.id", "p.author_id")
    .leftJoin("places as pl", "pl.id", "p.place_id")
    .select([
      "p.id",
      "p.caption",
      "p.created_at",
      "p.place_id",
      "p.author_id",
      "u.name as author_name",
      "u.handle as author_handle",
      "pl.name as place_name",
      "pl.address as place_address",
      "pl.district as place_district",
      sql<string | null>`pl.category::text`.as("place_category"),
      "pl.lat as place_lat",
      "pl.lng as place_lng",
      "pl.published_at as place_published_at",
      sql<
        string | null
      >`(SELECT pi.url FROM place_images pi WHERE pi.place_id = pl.id ORDER BY pi.position LIMIT 1)`.as(
        "place_image_url",
      ),
      sql<number>`(SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id)::int`.as("like_count"),
      sql<number>`(SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL)::int`.as(
        "comment_count",
      ),
      sql<boolean>`EXISTS (SELECT 1 FROM post_likes l WHERE l.post_id = p.id AND l.user_id = ${viewerId}::uuid)`.as(
        "liked_by_me",
      ),
      sql<boolean>`EXISTS (SELECT 1 FROM post_saves s WHERE s.post_id = p.id AND s.user_id = ${viewerId}::uuid)`.as(
        "saved_by_me",
      ),
      sql<
        string[] | string | null
      >`COALESCE((SELECT json_agg(pi.url ORDER BY pi.position, pi.id) FROM post_images pi WHERE pi.post_id = p.id), '[]'::json)`.as(
        "images",
      ),
    ])
}

export interface ListPostsParams {
  filter: PostFilter
  q?: string
  viewerId: string | null
  authorId?: string
  savedOf?: string
  placeId?: string
  cursor: Cursor | null
  pageSize: number
}

/** Feed phân trang keyset `(created_at, id)` giảm dần. */
export async function listPosts(
  params: ListPostsParams,
): Promise<{ items: PostDto[]; next: Cursor | null }> {
  let query = basePostsQuery(params.viewerId).where("p.deleted_at", "is", null)

  if (params.filter === "unplaced") query = query.where("p.place_id", "is", null)
  if (params.filter === "mine" && params.viewerId) {
    query = query.where("p.author_id", "=", params.viewerId)
  }
  if (params.filter === "saved") {
    query = query.where(
      sql<boolean>`EXISTS (SELECT 1 FROM post_saves s WHERE s.post_id = p.id AND s.user_id = ${params.viewerId}::uuid)`,
    )
  }
  if (params.filter === "following") {
    query = query.where(
      sql<boolean>`EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ${params.viewerId}::uuid AND f.following_id = p.author_id)`,
    )
  }
  if (params.authorId) query = query.where("p.author_id", "=", params.authorId)
  if (params.placeId) query = query.where("p.place_id", "=", params.placeId)
  if (params.savedOf) {
    query = query.where(
      sql<boolean>`EXISTS (SELECT 1 FROM post_saves s WHERE s.post_id = p.id AND s.user_id = ${params.savedOf}::uuid)`,
    )
  }
  if (params.q) {
    query = query.where(
      sql<boolean>`immutable_search_normalize(p.caption) LIKE '%' || immutable_search_normalize(${params.q}) || '%'`,
    )
  }
  if (params.cursor) {
    query = query.where(
      sql<boolean>`(p.created_at, p.id) < (${params.cursor.createdAt}::timestamptz, ${params.cursor.id}::uuid)`,
    )
  }

  const rows: PostRow[] = await query
    .orderBy("p.created_at", "desc")
    .orderBy("p.id", "desc")
    .limit(params.pageSize + 1)
    .execute()

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
  const row = await basePostsQuery(viewerId)
    .where("p.id", "=", id)
    .where("p.deleted_at", "is", null)
    .executeTakeFirst()
  return row ? toPostDto(row) : null
}
