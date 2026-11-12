/**
 * Hồ sơ người dùng — hợp đồng API của `GET /me` và `GET /users/:handle`.
 *
 * Server quyết định `isMe`; client không tự so sánh handle với user hiện tại.
 */
export interface UserProfile {
  id: string
  name: string
  handle: string
  /** Hai chữ cái đầu, dùng cho AvatarFallback */
  initials: string
  bio: string
  location: string
  /** Ảnh đại diện do người dùng tải lên; `null` = chưa có (fallback chữ cái đầu). */
  avatarUrl: string | null
  /** Ảnh bìa hồ sơ; `null` = chưa có (fallback khung trung tính). */
  coverUrl: string | null
  /** ISO date — client chỉ format, không tính toán. */
  joinedAt: string
  postCount: number
  followerCount: number
  followingCount: number
  followedByMe: boolean
  isMe: boolean
  /** Hồ sơ riêng tư: chỉ người theo dõi xem được bài đăng. */
  privateProfile: boolean
}

/** Tab trang cá nhân — server lọc theo tab, client chỉ gửi tham số. */
export type ProfileTab = "posts" | "pinned" | "saved"

/**
 * Một gợi ý người nên theo dõi — hợp đồng API của `GET /users/suggestions`.
 * `reason` chỉ nói về dữ liệu công khai (số đếm), không nhúng tên người khác.
 */
export interface UserSuggestion {
  user: UserProfile
  reason: string
}
