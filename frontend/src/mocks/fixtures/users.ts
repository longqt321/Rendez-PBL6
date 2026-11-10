import type { UserProfile } from "@/features/profile/types/profile"
import type { Author } from "@/features/social/types/post"

/**
 * Hồ sơ người dùng đang đăng nhập (demo).
 *
 * Cold-start không chứa tài khoản ảo nào khác (quyết định D-049): mọi tài khoản
 * khác chỉ xuất hiện khi có người dùng thật đăng ký.
 */
export const MOCK_USERS: Record<string, UserProfile> = {
  "u-me": {
    id: "u-me",
    name: "Minh Anh",
    handle: "minhanh.eats",
    initials: "MA",
    bio: "Săn quán Đà Nẵng, ghi lại từng bữa ăn đáng tiền. Ưu tiên quán nhỏ, chủ nhiệt tình.",
    location: "Đà Nẵng",
    joinedAt: "2025-03-14T00:00:00+07:00",
    postCount: 0,
    followerCount: 0,
    followingCount: 0,
    followedByMe: false,
    isMe: true,
    privateProfile: false,
  },
}

/** Người dùng đang đăng nhập. */
export const ME = MOCK_USERS["u-me"]

/**
 * Tác giả dạng rút gọn cho bài đăng / bình luận.
 *
 * `Author` là tập con các trường của `UserProfile`, nên suy thẳng từ `MOCK_USERS`
 * thay vì khai báo lại.
 */
export const CURRENT_USER: Author = ME
