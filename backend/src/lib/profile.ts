import type { User } from "../../generated/prisma/client"

/**
 * Chữ cái đầu của tên để hiện trong `AvatarFallback`: "Nguyễn Yến" → "NY".
 *
 * Port 1:1 từ `frontend/src/lib/format.ts#formatInitials` — server tính thay vì
 * tin client để mọi nơi hiển thị (header, comment, review) thống nhất.
 */
export function formatInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

/** Cột tối thiểu để dựng hồ sơ — cho phép truyền dòng SQL rút gọn, không cần cả model. */
export type ProfileSource = Pick<
  User,
  "id" | "name" | "handle" | "bio" | "location" | "privateProfile" | "createdAt"
>

/**
 * Hồ sơ công khai — khớp `userProfileSchema` của `@rendez/schema` (A2).
 *
 * `isMe`/`followedByMe` gán theo user đang gọi request (A6.3). Đếm là số
 * server đếm (A6.9) — caller truyền số đã query, không hardcode.
 */
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
  return {
    id: user.id,
    name: user.name,
    handle: user.handle,
    initials: formatInitials(user.name),
    bio: user.bio,
    location: user.location,
    joinedAt: user.createdAt.toISOString(),
    postCount: counts.postCount,
    followerCount: counts.followerCount,
    followingCount: counts.followingCount,
    followedByMe: counts.followedByMe,
    isMe: viewerId !== null && viewerId === user.id,
    privateProfile: user.privateProfile,
  }
}

export type UserProfileDto = ReturnType<typeof toUserProfile>
