
export type UserRole = "user" | "moderator" | "admin"

export interface UserProfile {
  id: string
  name: string
  handle: string

  initials: string
  bio: string
  location: string

  avatarUrl: string | null

  coverUrl: string | null

  joinedAt: string
  postCount: number
  followerCount: number
  followingCount: number
  followedByMe: boolean
  isMe: boolean

  privateProfile: boolean

  role?: UserRole
}

export type ProfileTab = "posts" | "pinned" | "saved"

export interface UserSuggestion {
  user: UserProfile
  reason: string
}
