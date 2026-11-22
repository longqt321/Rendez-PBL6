import { prisma } from "./prisma"
import { formatInitials } from "./profile"

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

function buildCollectionInclude(viewerId: string | null) {
  return {
    owner: { select: { id: true, name: true, handle: true } },
    items: {
      select: { placeId: true },
      orderBy: { position: "asc" as const },
    },
    _count: { select: { likes: true } },
    likes: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
  } as const
}

type PrismaCollectionRecord = {
  id: string
  name: string
  description: string
  isPrivate: boolean
  createdAt: Date
  owner: { id: string; name: string; handle: string }
  items: { placeId: string }[]
  _count: { likes: number }
  likes?: { userId: string }[]
}

function toCollectionRow(record: PrismaCollectionRecord): CollectionRow {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    is_private: record.isPrivate,
    created_at: record.createdAt,
    owner_id: record.owner.id,
    owner_name: record.owner.name,
    owner_handle: record.owner.handle,
    like_count: record._count.likes,
    liked_by_me: Array.isArray(record.likes) && record.likes.length > 0,
    place_ids: record.items.map((item) => item.placeId),
  }
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

/** Số bộ sưu tập trả về tối đa khi liệt kê (mặc định 50, cap 100). */
export const DEFAULT_COLLECTION_LIMIT = 50
const MAX_COLLECTION_LIMIT = 100

/** Bộ sưu tập của một user (đã lọc private theo quyền xem). */
export async function listCollectionsOfOwner(
  ownerId: string,
  viewerId: string | null,
  limit: number = DEFAULT_COLLECTION_LIMIT,
): Promise<CollectionRow[]> {
  const safeLimit = Number.isFinite(limit)
    ? Math.min(MAX_COLLECTION_LIMIT, Math.max(1, Math.trunc(limit)))
    : DEFAULT_COLLECTION_LIMIT

  const records = await prisma.collection.findMany({
    where: {
      ownerId,
      deletedAt: null,
      ...(viewerId === ownerId ? {} : { isPrivate: false }),
    },
    include: buildCollectionInclude(viewerId),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: safeLimit,
  })
  return records.map((record) => toCollectionRow(record as PrismaCollectionRecord))
}

/** Một bộ sưu tập nhìn được bởi viewer — private của người khác trả `null` (404). */
export async function findCollection(
  id: string,
  viewerId: string | null,
): Promise<CollectionRow | null> {
  const record = await prisma.collection.findFirst({
    where: {
      id,
      deletedAt: null,
      OR: [{ isPrivate: false }, ...(viewerId ? [{ ownerId: viewerId }] : [])],
    },
    include: buildCollectionInclude(viewerId),
  })
  return record ? toCollectionRow(record as PrismaCollectionRecord) : null
}

export async function findCollectionById(
  id: string,
  viewerId: string | null,
): Promise<CollectionRow | null> {
  const record = await prisma.collection.findFirst({
    where: { id, deletedAt: null },
    include: buildCollectionInclude(viewerId),
  })
  return record ? toCollectionRow(record as PrismaCollectionRecord) : null
}
