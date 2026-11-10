import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"
import { formatInitials } from "./profile"

/**
 * Truy vấn bộ sưu tập (T5.1) — dùng `Prisma.sql` tham số hoá, không nối chuỗi.
 *
 * `placeIds` giữ thứ tự thêm (`collection_places.position` tăng dần), đếm like
 * bằng COUNT thật, `likedByMe` bằng EXISTS theo user đang gọi.
 */

export interface CollectionRow {
  id: string
  name: string
  description: string
  is_private: boolean
  created_at: Date
  owner_id: string
  owner_name: string
  owner_handle: string
  like_count: number
  liked_by_me: boolean
  place_ids: string[]
}

function selectCollection(viewerId: string | null): Prisma.Sql {
  const viewer = Prisma.sql`${viewerId}::uuid`
  return Prisma.sql`
    SELECT c.id, c.name, c.description, c.is_private, c.created_at,
           u.id AS owner_id, u.name AS owner_name, u.handle AS owner_handle,
           (SELECT COUNT(*) FROM collection_likes cl WHERE cl.collection_id = c.id)::int AS like_count,
           EXISTS (SELECT 1 FROM collection_likes cl
                   WHERE cl.collection_id = c.id AND cl.user_id = ${viewer}) AS liked_by_me,
           ARRAY(
             SELECT cp.place_id FROM collection_places cp
             WHERE cp.collection_id = c.id ORDER BY cp.position
           ) AS place_ids
    FROM collections c
    JOIN users u ON u.id = c.owner_id
  `
}

export function toCollectionDto(row: CollectionRow, viewerId: string | null) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isPrivate: row.is_private,
    owner: {
      id: row.owner_id,
      name: row.owner_name,
      handle: row.owner_handle,
      initials: formatInitials(row.owner_name),
    },
    placeIds: row.place_ids,
    createdAt: row.created_at.toISOString(),
    isMine: viewerId !== null && viewerId === row.owner_id,
    likeCount: Number(row.like_count),
    likedByMe: row.liked_by_me,
  }
}

export function toCollectionSummary(row: CollectionRow, targetPlaceId?: string | null) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isPrivate: row.is_private,
    placeCount: row.place_ids.length,
    previewPlaceIds: row.place_ids.slice(0, 3),
    createdAt: row.created_at.toISOString(),
    likeCount: Number(row.like_count),
    likedByMe: row.liked_by_me,
    // `containsPlace` CHỈ xuất hiện khi query có `?placeId=` (A6.5).
    ...(targetPlaceId ? { containsPlace: row.place_ids.includes(targetPlaceId) } : {}),
  }
}

/** Bộ sưu tập của một user (đã lọc private theo quyền xem). */
export async function listCollectionsOfOwner(
  ownerId: string,
  viewerId: string | null,
): Promise<CollectionRow[]> {
  return prisma.$queryRaw<CollectionRow[]>(Prisma.sql`
    ${selectCollection(viewerId)}
    WHERE c.owner_id = ${ownerId}::uuid AND c.deleted_at IS NULL
      AND (c.is_private = false OR c.owner_id = ${Prisma.sql`${viewerId}::uuid`})
    ORDER BY c.created_at DESC, c.id DESC
  `)
}

/** Một bộ sưu tập nhìn được bởi viewer — private của người khác trả `null` (404). */
export async function findCollection(
  id: string,
  viewerId: string | null,
): Promise<CollectionRow | null> {
  const rows = await prisma.$queryRaw<CollectionRow[]>(Prisma.sql`
    ${selectCollection(viewerId)}
    WHERE c.id = ${id}::uuid AND c.deleted_at IS NULL
      AND (c.is_private = false OR c.owner_id = ${Prisma.sql`${viewerId}::uuid`})
    LIMIT 1
  `)
  return rows[0] ?? null
}

/** Đọc lại một bộ sưu tập sau mutation (không áp bộ lọc private — caller đã kiểm quyền). */
export async function findCollectionById(
  id: string,
  viewerId: string | null,
): Promise<CollectionRow | null> {
  const rows = await prisma.$queryRaw<CollectionRow[]>(Prisma.sql`
    ${selectCollection(viewerId)}
    WHERE c.id = ${id}::uuid AND c.deleted_at IS NULL
    LIMIT 1
  `)
  return rows[0] ?? null
}
