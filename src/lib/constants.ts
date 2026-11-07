/**
 * Hằng số dùng chung giữa client và mock server.
 *
 * Mọi giới hạn ký tự / toạ độ mặc định phải khai ở đây — không viết số trực
 * tiếp trong component hay trong `mocks/server.ts`, vì hai bên phải khớp nhau.
 */

// ---------------------------------------------------------------------------
// Địa lý
// ---------------------------------------------------------------------------

export interface Coordinates {
  lat: number
  lng: number
}

/** Toạ độ Cầu Rồng — tâm Đà Nẵng, dùng làm fallback khi không lấy được GPS. */
export const DANANG_CENTER: Coordinates = {
  lat: 16.0612,
  lng: 108.2272,
}

/** Tâm mặc định của bản đồ khi chưa có vị trí người dùng (cùng một nguồn). */
export const DANANG_CENTER_TUPLE: [number, number] = [DANANG_CENTER.lat, DANANG_CENTER.lng]

/** Mức zoom mặc định cho bản đồ Đà Nẵng. */
export const DANANG_DEFAULT_ZOOM = 13

// ---------------------------------------------------------------------------
// Giới hạn ký tự — khớp validate ở `mocks/server.ts`
// ---------------------------------------------------------------------------

/** Caption bài đăng. Server từ chối nếu vượt. */
export const MAX_CAPTION_LENGTH = 500

/** Caption tối thiểu để được đăng. */
export const MIN_CAPTION_LENGTH = 3

/** Số ký tự tối thiểu để bắt đầu gợi ý địa điểm trong composer. */
export const PLACE_SUGGESTION_MIN_CHARS = 8

/** Nội dung đánh giá địa điểm. */
export const MAX_REVIEW_CONTENT_LENGTH = 1000

/** Tên bộ sưu tập. */
export const MAX_COLLECTION_NAME_LENGTH = 80

/** Mô tả bộ sưu tập. */
export const MAX_COLLECTION_DESCRIPTION_LENGTH = 400
