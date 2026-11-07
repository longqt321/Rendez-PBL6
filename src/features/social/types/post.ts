import type { PlaceSummary } from "@/features/places/types/place"

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
  imageSeed: string
  imageHeight: number
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
}

export interface CreatePostInput {
  caption: string
  imageSeed: string
  placeId: string | null
}

/** Bộ lọc feed — server lọc, frontend chỉ gửi tham số. */
export type PostFeedFilter = "all" | "unplaced" | "mine"
