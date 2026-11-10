import type { Author } from "@/features/social/types/post"

/**
 * Đánh giá của người dùng cho một địa điểm.
 *
 * Form chỉ cho nhập số sao (1–5) và nội dung text — không có ảnh hay file đính kèm.
 * Mỗi người dùng chỉ giữ MỘT đánh giá cho mỗi địa điểm: đánh giá lại là ghi đè.
 */
export interface Review {
  id: string
  placeId: string
  author: Author
  rating: number
  content: string
  createdAt: string
  /** Đúng khi bản ghi thuộc về người dùng đang đăng nhập (client dùng để hiện nút sửa). */
  isMine: boolean
}
