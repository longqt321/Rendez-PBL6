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

// ---------------------------------------------------------------------------
// Chuyến đi & lịch trình ngày
// ---------------------------------------------------------------------------

/** Tên chuyến đi. */
export const MAX_TRIP_NAME_LENGTH = 80

/** Số ngày tối đa của một chuyến đi — chặn ở form tạo/chỉnh. */
export const MAX_TRIP_DAYS = 30

/** Số chặng tối đa trong một lịch trình ngày. */
export const MAX_DAY_PLAN_STOPS = 20

// ---------------------------------------------------------------------------
// Chia hóa đơn
// ---------------------------------------------------------------------------

/** Tổng tiền một bill (đồng) — chặn trên để tránh số vô lý do gõ nhầm. */
export const MAX_BILL_AMOUNT = 100_000_000

/** Số người tối đa khi chia bill. */
export const MAX_BILL_PEOPLE = 20

// ---------------------------------------------------------------------------
// Món phải thử Đà Nẵng — danh sách curated tĩnh, khớp `tags` trong fixture
// ---------------------------------------------------------------------------

/** Một món đặc trưng cần thử: `tag` phải trùng chính xác một tag của `Place`. */
export interface MustTryDish {
  label: string
  tag: string
}

/**
 * Món phải thử khi đến Đà Nẵng — danh sách do con người curated, KHÔNG sinh tự động
 * từ tần suất tag. Mỗi `tag` đã được đối chiếu có thật trong `src/mocks/fixtures/places.ts`.
 */
export const MUST_TRY_DISHES: MustTryDish[] = [
  { label: "Mì Quảng", tag: "mì quảng" },
  { label: "Bánh xèo", tag: "bánh xèo" },
  { label: "Bún chả cá", tag: "bún chả cá" },
  { label: "Bánh tráng thịt heo", tag: "bánh tráng thịt heo" },
  { label: "Cà phê muối", tag: "cà phê muối" },
  { label: "Bánh canh cá nục", tag: "bánh canh cá nục" },
  { label: "Bê thui", tag: "bê thui" },
  { label: "Gà nướng lu", tag: "gà nướng lu" },
  { label: "Ốc hút", tag: "ốc hút" },
  { label: "Hải sản", tag: "hải sản tươi sống" },
]
