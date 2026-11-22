import type { UserRole } from "@rendez/schema"
import { prisma } from "./prisma"
import { toUserProfile } from "./profile"

const PROFILE_SELECT = {
  id: true,
  name: true,
  handle: true,
  bio: true,
  location: true,
  avatarUrl: true,
  coverUrl: true,
  privateProfile: true,
  role: true,
  createdAt: true,
} as const

type ProfileRecord = {
  id: string
  name: string
  handle: string
  bio: string
  location: string
  avatarUrl: string | null
  coverUrl: string | null
  privateProfile: boolean
  role: string
  createdAt: Date
}

async function countProfile(userId: string, viewerId: string | null, row: ProfileRecord) {
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
      avatarUrl: row.avatarUrl,
      coverUrl: row.coverUrl,
      privateProfile: row.privateProfile,
      role: row.role as UserRole,
      createdAt: row.createdAt,
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
  const row = await prisma.user.findFirst({
    where: { handle, deletedAt: null },
    select: PROFILE_SELECT,
  })
  return row ? countProfile(row.id, viewerId, row) : null
}

/** Hồ sơ theo id — dùng cho `/me` và sau khi follow (trả profile mới nhất). */
export async function findProfileById(
  userId: string,
  viewerId: string | null,
): Promise<ReturnType<typeof toUserProfile> | null> {
  const row = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: PROFILE_SELECT,
  })
  return row ? countProfile(row.id, viewerId, row) : null
}

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
