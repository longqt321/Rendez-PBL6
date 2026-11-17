import type { MockCommentSeed } from "../types"
import { MOCK_USERS } from "./users"

/**
 * Bình luận của mock server — gắn vào các bài đăng trong `fixtures/posts.ts`.
 * `deleted` do mock server tự gán (`false` khi nạp), seed không cần khai.
 */
export const MOCK_COMMENTS: MockCommentSeed[] = [
  {
    id: "c-mock-1",
    postId: "p-mock-1",
    author: MOCK_USERS["u-lan"],
    body: "Quán này mình đi 3 lần rồi, chưa lần nào thất vọng. Nước mắm phải kèm thêm ớt mới đúng vị.",
    createdAt: "2026-11-15T12:05:00+07:00",
    likeCount: 4,
    likedByMe: false,
    parentId: null,
  },
  {
    id: "c-mock-2",
    postId: "p-mock-1",
    author: MOCK_USERS["u-hieu"],
    body: "Bánh xèo ở đây nhỏ hơn chỗ khác nhưng bù lại tôm nhiều. Đi trưa tránh đông.",
    createdAt: "2026-11-15T14:20:00+07:00",
    likeCount: 2,
    likedByMe: true,
    parentId: null,
  },
  {
    id: "c-mock-3",
    postId: "p-mock-2",
    author: MOCK_USERS["u-mai"],
    body: "Mì Quảng 1A đúng chuẩn, mình ăn ở đây 5 năm rồi chưa đổi quán.",
    createdAt: "2026-11-14T09:30:00+07:00",
    likeCount: 6,
    likedByMe: false,
    parentId: null,
  },
  {
    id: "c-mock-4",
    postId: "p-mock-3",
    author: MOCK_USERS["u-lan"],
    body: "Ếch chiên ở đây giòn hơn Bếp Trang cũ, giá cũng hợp lý.",
    createdAt: "2026-11-13T20:10:00+07:00",
    likeCount: 1,
    likedByMe: false,
    parentId: null,
  },
]
