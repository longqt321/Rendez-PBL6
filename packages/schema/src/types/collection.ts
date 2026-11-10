import type { Author } from "./post"

/**
 * Bộ sưu tập địa điểm do người dùng tự tạo.
 *
 * Thành viên là danh sách `placeIds` — thứ tự do người dùng (thêm mới đẩy xuống
 * cuối). `isPrivate` quyết định bộ sưu tập có hiện ở trang cá nhân công khai hay
 * không; link trực tiếp vẫn xem được.
 */
export interface Collection {
  id: string
  name: string
  description: string
  isPrivate: boolean
  owner: Author
  /** Id địa điểm theo thứ tự thêm; chi tiết địa điểm tra qua API địa điểm. */
  placeIds: string[]
  createdAt: string
  isMine: boolean
  /** Số lượt thả tim — server đếm, client chỉ hiển thị. */
  likeCount: number
  /** Người dùng hiện tại đã thả tim bộ sưu tập này chưa. */
  likedByMe: boolean
}

/** Bản rút gọn nhúng khi liệt kê — chưa cần danh sách địa điểm đầy đủ. */
export interface CollectionSummary {
  id: string
  name: string
  description: string
  isPrivate: boolean
  placeCount: number
  /** 3 địa điểm đầu để render ảnh bìa preview. */
  previewPlaceIds: string[]
  createdAt: string
  /** Có chứa địa điểm đang truy vấn không (khi gọi kèm `?placeId=...`). */
  containsPlace?: boolean
  likeCount: number
  likedByMe: boolean
}
