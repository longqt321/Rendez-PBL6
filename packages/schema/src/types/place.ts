export type PlaceCategory = "cafe" | "restaurant" | "street-food" | "bakery" | "dessert" | "bar"

/**
 * Trạng thái hoạt động của địa điểm — server kết luận (từ báo cáo đã duyệt),
 * client chỉ hiển thị, không tự suy ra.
 */
export type PlaceStatus = "open" | "closed" | "unknown"

/** Địa điểm đầy đủ — dùng cho lưới /discover. */
export interface Place {
  id: string
  name: string
  address: string
  city: string
  /** Quận / Huyện tại Đà Nẵng (Hải Châu, Sơn Trà, v.v.) */
  district?: string
  category: PlaceCategory
  tags: string[]
  rating: number
  reviewCount: number
  priceLevel: 1 | 2 | 3
  /** URL ảnh thật của quán (cold-start); thiếu thì UI hiện placeholder trung tính. */
  imageUrl?: string
  /** Chiều cao ảnh (px) cho bố cục masonry trên mobile */
  imageHeight: number
  /** Vĩ độ toạ độ địa lý (WGS84) */
  lat?: number
  /** Kinh độ toạ độ địa lý (WGS84) */
  lng?: number
  /** Quán còn hoạt động hay không — thiếu/không rõ thì server không gửi trường này. */
  status?: PlaceStatus
  /** Mô tả ngắn của địa điểm (từ dataset) — server không có thì không gửi. */
  description?: string
  /**
   * Giờ mở cửa thô (chuẩn OSM: "24/7", "Mo-Su 08:00-22:00", …) — server không
   * có thì không gửi trường này; client tự suy ra trạng thái mở/đóng để hiển thị.
   */
  openingHours?: string
  /** Ngày duyệt lên /discover (ISO 8601) — FE dùng cho badge "Mới"; null khi chưa duyệt. */
  publishedAt: string | null
}

/**
 * Bản rút gọn server nhúng vào bài đăng và đề xuất.
 *
 * `isPublished` là kết luận của server (địa điểm đã được duyệt lên /discover hay chưa).
 * Frontend chỉ hiển thị, không tự suy ra.
 */
export interface PlaceSummary {
  id: string
  name: string
  address: string
  district?: string
  category: PlaceCategory
  /** URL ảnh thật của quán (cold-start); thiếu thì UI hiện placeholder trung tính. */
  imageUrl?: string
  isPublished: boolean
  lat?: number
  lng?: number
}

/**
 * Một đề xuất địa điểm do server trả về.
 *
 * Server đã xếp hạng và chọn sẵn; frontend chỉ render đúng thứ tự nhận được.
 */
export interface PlaceSuggestion {
  place: PlaceSummary
  /** Lý do ngắn gọn do server sinh để người dùng hiểu vì sao được đề xuất */
  reason: string
}

/**
 * Một quán trong dải "Gợi ý hôm nay" — server chọn sẵn, kèm lý do ngắn.
 *
 * Dùng `Place` đầy đủ (không phải `PlaceSummary`) vì FE render lại `PlaceCard`.
 */
/**
 * "Vì sao quán này được gợi ý" — server tính từ chính breakdown điểm của thuật
 * toán daily-picks; client chỉ hiển thị, không tự tính lại.
 */
export interface DailyPickWhy {
  /** Điểm chuẩn hoá (0–100, số nguyên): score/maxScore của thuật toán chọn. */
  matchPercent: number
  /** Quận của quán — thiếu khi quán không có dữ liệu quận. */
  district?: string
  /** Khoảng cách tới người xem (km) — endpoint daily-picks không có toạ độ người xem nên `null`. */
  distanceKm: number | null
  /** Đang mở cửa theo `opening_hours` (Asia/Ho_Chi_Minh); `null` = không biết. */
  openNow: boolean | null
  /** Các lý do thật dùng để chọn (ảnh thật, nhiều đánh giá, quán mới…) — tối đa 3. */
  signals: string[]
}

export interface DailyPick {
  place: Place
  reason: string
  /** Optional để không phá consumer cũ chưa đọc trường này. */
  why?: DailyPickWhy
}

/** Payload `GET /places/daily-picks` — `date` theo Asia/Ho_Chi_Minh (`YYYY-MM-DD`). */
export interface DailyPicks {
  date: string
  /** Tối đa 3 quán; rỗng khi job chưa chạy hoặc chưa đủ ứng viên. */
  items: DailyPick[]
}
