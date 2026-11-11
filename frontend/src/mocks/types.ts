import type { Author, Post } from "@/features/social/types/post"
import type { PlaceReport } from "@/features/places/types/place-report"
import type { RoomFilter, RoomProposal } from "@/features/rooms/types/room"

/**
 * Bản ghi bài đăng trong "database" của server giả lập.
 *
 * Server chỉ lưu `placeId`; object `place` được nhúng vào response lúc serialize.
 * Đây là chi tiết nội bộ phía server — frontend không bao giờ thấy type này.
 */
export type MockPost = Omit<Post, "place">

/**
 * Bản ghi bình luận trong "database" của server giả lập.
 *
 * Server chỉ lưu `parentId`; object `replyTo` (handle người được trả lời) được
 * suy ra từ bình luận cha lúc serialize. Xoá mềm: bản ghi giữ lại trong db để
 * cây reply không mất cha, nhưng nội dung không còn được trả về. Chi tiết nội
 * bộ — frontend không thấy type này.
 */
export interface MockComment {
  id: string
  postId: string
  author: Author
  body: string
  createdAt: string
  likeCount: number
  likedByMe: boolean
  parentId: string | null
  deleted: boolean
}

/** Dữ liệu seed chưa có trạng thái xoá — server gán `deleted: false` khi nạp. */
export type MockCommentSeed = Omit<MockComment, "deleted">

/**
 * Bản ghi đánh giá địa điểm trong "database" của server giả lập.
 *
 * Mỗi (placeId, authorId) chỉ tồn tại tối đa một bản ghi — đánh giá lại là ghi
 * đè bản cũ. `isMine` không lưu trong db; server gán lúc serialize dựa trên
 * người dùng hiện tại. Chi tiết nội bộ — frontend không thấy type này.
 */
export interface MockReview {
  id: string
  placeId: string
  author: Author
  /** Số nguyên 1–5. */
  rating: number
  /** Chỉ text: form đánh giá không nhận ảnh hay file đính kèm. */
  content: string
  createdAt: string
}

/** Dữ liệu seed cho đánh giá. */
export type MockReviewSeed = MockReview

/**
 * Bản ghi báo cáo địa điểm trong "database" của server giả lập.
 *
 * Server chỉ lưu `reporterId`; hợp đồng API (`PlaceReport`) không có tác giả —
 * báo cáo là dữ liệu kiểm duyệt, client không cần biết ai gửi. Chi tiết nội bộ.
 */
export type MockReport = PlaceReport & { reporterId: string }

/**
 * Bộ sưu tập địa điểm của người dùng trong "database" của server giả lập.
 *
 * `isMine` không lưu; server gán lúc serialize dựa trên người dùng hiện tại.
 * Chi tiết nội bộ — frontend không thấy type này.
 */
export interface MockCollection {
  id: string
  name: string
  description: string
  isPrivate: boolean
  owner: Author
  placeIds: string[]
  createdAt: string
  /** Số lượt thả tim — server đếm. */
  likeCount: number
  /** Người dùng hiện tại đã thả tim chưa — server lưu, không suy ra lúc serialize. */
  likedByMe: boolean
}

/** Thành viên phòng trong db của mock — `isMe` tính lúc serialize. */
export interface MockRoomMember {
  id: string
  displayName: string
  joinedAt: string
  /** Chỉ chủ phòng (đăng nhập) có userId; khách là `null`. */
  userId: string | null
}

/** Phòng lọc nhóm trong db của mock. */
export interface MockRoom {
  id: string
  code: string
  name: string
  members: MockRoomMember[]
  proposals: RoomProposal[]
  filter: RoomFilter
  createdAt: string
}
