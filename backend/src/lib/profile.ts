import type { UserRole } from "@rendez/schema"
import type { User } from "../../generated/prisma/client"

export function formatInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

export type ProfileSource = Pick<
  User,
  | "id"
  | "name"
  | "handle"
  | "bio"
  | "location"
  | "avatarUrl"
  | "coverUrl"
  | "privateProfile"
  | "createdAt"
> & { role?: UserRole }

export function toUserProfile(
  user: ProfileSource,
  viewerId: string | null,
  counts: {
    postCount: number
    followerCount: number
    followingCount: number
    followedByMe: boolean
  },
) {
  const isMe = viewerId !== null && viewerId === user.id
  return {
    id: user.id,
    name: user.name,
    handle: user.handle,
    initials: formatInitials(user.name),
    bio: user.bio,
    location: user.location,
    avatarUrl: user.avatarUrl,
    coverUrl: user.coverUrl,
    joinedAt: user.createdAt.toISOString(),
    postCount: counts.postCount,
    followerCount: counts.followerCount,
    followingCount: counts.followingCount,
    followedByMe: counts.followedByMe,
    isMe,
    privateProfile: user.privateProfile,
    ...(isMe && user.role ? { role: user.role } : {}),
  }
}

export type UserProfileDto = ReturnType<typeof toUserProfile>
