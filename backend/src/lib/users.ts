import type { UserRole } from "@rendez/schema"
import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"
import { toUserProfile } from "./profile"

interface ProfileRow {
  id: string
  name: string
  handle: string
  bio: string
  location: string
  avatar_url: string | null
  cover_url: string | null
  private_profile: boolean
  role: string
  created_at: Date
}

const SELECT_PROFILE = Prisma.sql`
  SELECT u.id, u.name, u.handle, u.bio, u.location, u.avatar_url, u.cover_url, u.private_profile, u.role::text AS role, u.created_at
  FROM users u
  WHERE u.deleted_at IS NULL
`

async function countProfile(userId: string, viewerId: string | null, row: ProfileRow) {
  const [postCount, followerCount, followingCount, followedByMe] = await Promise.all([
    prisma.post.count({ where: { authorId: userId, deletedAt: null } }),
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
    viewerId
      ? prisma.follow
          .count({ where: { followerId: viewerId, followingId: userId } })
          .then((n) => n > 0)
      : Promise.resolve(false),
  ])

  return toUserProfile(
    {
      id: row.id,
      name: row.name,
      handle: row.handle,
      bio: row.bio,
      location: row.location,
      avatarUrl: row.avatar_url,
      coverUrl: row.cover_url,
      privateProfile: row.private_profile,
      role: row.role as UserRole,
      createdAt: row.created_at,
    },
    viewerId,
    { postCount, followerCount, followingCount, followedByMe },
  )
}

export function canViewPrivateContent(
  ownerId: string,
  privateProfile: boolean,
  viewerId: string | null,
): boolean {
  return !privateProfile || viewerId === ownerId
}

export async function findProfileByHandle(
  handle: string,
  viewerId: string | null,
): Promise<ReturnType<typeof toUserProfile> | null> {
  const rows = await prisma.$queryRaw<ProfileRow[]>(Prisma.sql`
    ${SELECT_PROFILE} AND u.handle = ${handle}
    LIMIT 1
  `)
  const row = rows[0]
  return row ? countProfile(row.id, viewerId, row) : null
}

/** Hồ sơ theo id — dùng cho `/me` và sau khi follow (trả profile mới nhất). */
export async function findProfileById(
  userId: string,
  viewerId: string | null,
): Promise<ReturnType<typeof toUserProfile> | null> {
  const rows = await prisma.$queryRaw<ProfileRow[]>(Prisma.sql`
    ${SELECT_PROFILE} AND u.id = ${userId}::uuid
    LIMIT 1
  `)
  const row = rows[0]
  return row ? countProfile(row.id, viewerId, row) : null
}

/**
 * Theo dõi / bỏ theo dõi — idempotent; trả `true` khi THỰC SỰ tạo mới quan hệ
 * (route chỉ thông báo cho người được theo dõi ở lần đầu, tránh spam mỗi lần
 * client gọi lại).
 *
 * `createMany({ skipDuplicates: true })` là một câu lệnh nguyên tử: hai request
 * song song không thể cùng tạo (khác với findUnique-rồi-create, nơi request thứ
 * hai sẽ ném P2002 → 500).
 */
export async function setFollow(
  followerId: string,
  followingId: string,
  followed: boolean,
): Promise<boolean> {
  if (followed) {
    const { count } = await prisma.follow.createMany({
      data: [{ followerId, followingId }],
      skipDuplicates: true,
    })
    return count > 0
  }

  await prisma.follow.deleteMany({ where: { followerId, followingId } })
  return false
}
