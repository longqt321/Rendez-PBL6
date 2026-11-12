import type { UserProfile } from "@/features/profile/types/profile"
import type { Author } from "@/features/social/types/post"

/**
 * Hồ sơ người dùng (demo).
 *
 * Cold-start chỉ có tài khoản demo của chính mình (quyết định D-049); ba hồ sơ
 * "u-lan"/"u-hieu"/"u-mai" là dữ liệu mẫu tối thiểu để tab "Người" và khối
 * "Gợi ý theo dõi" có nội dung để kiểm thử. `setFollow` của mock server sửa
 * trực tiếp các object này (cùng tham chiếu với `db.users`), nên trạng thái
 * "Đang theo dõi" luôn nhất quán giữa kết quả tìm kiếm và gợi ý.
 */
export const MOCK_USERS: Record<string, UserProfile> = {
  "u-me": {
    id: "u-me",
    name: "Minh Anh",
    handle: "minhanh.eats",
    initials: "MA",
    bio: "Săn quán Đà Nẵng, ghi lại từng bữa ăn đáng tiền. Ưu tiên quán nhỏ, chủ nhiệt tình.",
    location: "Đà Nẵng",
    avatarUrl: null,
    coverUrl: null,
    joinedAt: "2025-03-14T00:00:00+07:00",
    postCount: 0,
    followerCount: 0,
    followingCount: 0,
    followedByMe: false,
    isMe: true,
    privateProfile: false,
  },
  "u-lan": {
    id: "u-lan",
    name: "Lan Anh",
    handle: "lananh.cafe",
    initials: "LA",
    bio: "Săn cà phê specialty khắp Sài Gòn.",
    location: "TP. Hồ Chí Minh",
    avatarUrl: null,
    coverUrl: null,
    joinedAt: "2025-06-02T00:00:00+07:00",
    postCount: 0,
    followerCount: 0,
    followingCount: 0,
    followedByMe: false,
    isMe: false,
    privateProfile: false,
  },
  "u-hieu": {
    id: "u-hieu",
    name: "Hiếu Food",
    handle: "hieu.food",
    initials: "HF",
    bio: "Ăn sập Đà Nẵng, review thật - ăn thật.",
    location: "Đà Nẵng",
    avatarUrl: null,
    coverUrl: null,
    joinedAt: "2025-08-20T00:00:00+07:00",
    postCount: 0,
    followerCount: 0,
    followingCount: 0,
    followedByMe: false,
    isMe: false,
    privateProfile: false,
  },
  "u-mai": {
    id: "u-mai",
    name: "Mai Nguyễn",
    handle: "mai.nguyen",
    initials: "MN",
    bio: "Ghi lại mỗi bữa sáng vỉa hè đáng tiền.",
    location: "Hà Nội",
    avatarUrl: null,
    coverUrl: null,
    joinedAt: "2025-10-11T00:00:00+07:00",
    postCount: 0,
    followerCount: 0,
    followingCount: 0,
    followedByMe: false,
    isMe: false,
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
