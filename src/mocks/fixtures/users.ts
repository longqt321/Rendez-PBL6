import type { UserProfile } from "@/features/profile/types/profile"
import type { Author } from "@/features/social/types/post"

/**
 * Hồ sơ mẫu. `me` khớp `CURRENT_USER` trong fixtures/posts.ts — cùng id/handle.
 *
 * `postCount`/`followerCount` là dữ liệu seed; server tự cập nhật khi có thay đổi.
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
    postCount: 2,
    followerCount: 128,
    followingCount: 64,
    followedByMe: false,
    isMe: true,
  },
  "u-1": {
    id: "u-1",
    name: "Trần Bảo",
    handle: "bao.an.day",
    initials: "TB",
    bio: "Ăn để sống, sống để ăn. Review thật, không quảng cáo.",
    location: "Đà Nẵng",
    joinedAt: "2024-11-02T00:00:00+07:00",
    postCount: 2,
    followerCount: 342,
    followingCount: 87,
    followedByMe: true,
    isMe: false,
  },
  "u-2": {
    id: "u-2",
    name: "Lê Thu Hà",
    handle: "thuha.foodmap",
    initials: "TH",
    bio: "Food map cá nhân. Đi là ghi, ghi là chia sẻ.",
    location: "Đà Nẵng",
    joinedAt: "2025-01-20T00:00:00+07:00",
    postCount: 2,
    followerCount: 519,
    followingCount: 122,
    followedByMe: false,
    isMe: false,
  },
  "u-3": {
    id: "u-3",
    name: "Phạm Quốc",
    handle: "quoc.around",
    initials: "PQ",
    bio: "Cà phê + laptop là đủ một ngày vui.",
    location: "Đà Nẵng",
    joinedAt: "2024-06-09T00:00:00+07:00",
    postCount: 2,
    followerCount: 203,
    followingCount: 45,
    followedByMe: false,
    isMe: false,
  },
  "u-4": {
    id: "u-4",
    name: "Nguyễn Yến",
    handle: "yen.danang",
    initials: "NY",
    bio: "Đà Nẵng có gì ăn ngon là lên đây hết.",
    location: "Đà Nẵng",
    joinedAt: "2025-05-30T00:00:00+07:00",
    postCount: 2,
    followerCount: 876,
    followingCount: 210,
    followedByMe: false,
    isMe: false,
  },
  "u-5": {
    id: "u-5",
    name: "Đỗ Khánh",
    handle: "khanh.brunch",
    initials: "ĐK",
    bio: "Brunch là một bữa nghiêm túc.",
    location: "Đà Nẵng",
    joinedAt: "2025-08-11T00:00:00+07:00",
    postCount: 2,
    followerCount: 154,
    followingCount: 98,
    followedByMe: false,
    isMe: false,
  },
}

/** Người dùng đang đăng nhập. */
export const ME = MOCK_USERS["u-me"]

/**
 * Tác giả dạng rút gọn cho bài đăng / bình luận.
 *
 * `Author` là tập con các trường của `UserProfile`, nên suy thẳng từ `MOCK_USERS`
 * thay vì khai báo lại. Trước đây `fixtures/posts.ts` và `fixtures/comments.ts`
 * mỗi file tự định nghĩa một bản `CURRENT_USER`/`AUTHORS` giống hệt — sửa một
 * chỗ là lệch ba chỗ.
 */
export const CURRENT_USER: Author = ME

/** Tác giả mẫu (trừ chính mình), tra theo id. */
export const AUTHORS: Record<string, Author> = {
  "u-1": MOCK_USERS["u-1"],
  "u-2": MOCK_USERS["u-2"],
  "u-3": MOCK_USERS["u-3"],
  "u-4": MOCK_USERS["u-4"],
  "u-5": MOCK_USERS["u-5"],
}

/** Dạng mảng, giữ đúng thứ tự u-1 → u-5, để seed bài đăng theo chỉ số. */
export const AUTHOR_LIST: Author[] = Object.values(AUTHORS)
