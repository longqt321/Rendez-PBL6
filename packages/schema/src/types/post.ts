import type { PlaceSummary } from "./place"

export interface Author {
  id: string
  name: string
  handle: string
  /** Hai chữ cái đầu, dùng cho AvatarFallback */
  initials: string
}

export interface Post {
  id: string
  author: Author
  caption: string
  createdAt: string
  /** null = bài đăng chưa gắn địa điểm nào */
  placeId: string | null
  /**
   * Địa điểm đã gắn, do server nhúng kèm.
   *
   * null khi bài chưa gắn địa điểm. Frontend không tự tra cứu id → địa điểm,
   * vì việc đó sẽ tạo thêm một nguồn sự thật thứ hai.
   */
  place: PlaceSummary | null
  likeCount: number
  commentCount: number
  likedByMe: boolean
  savedByMe: boolean
  /**
   * URL ảnh công khai, đúng thứ tự người đăng chọn.
   *
   * Luôn là mảng (rỗng khi bài không có ảnh) — server không bao giờ trả `null`,
   * để client khỏi phải phân biệt hai trạng thái "không có ảnh".
   */
  images: string[]
}

export interface CreatePostInput {
  caption: string
  placeId: string | null
  /** URL ảnh đã tải lên R2 (tối đa `MAX_POST_IMAGES`); bỏ trống = bài chỉ có chữ. */
  images?: string[]
}

/** Bộ lọc feed — server lọc, frontend chỉ gửi tham số. */
export type PostFeedFilter = "all" | "unplaced" | "mine" | "saved" | "following"
