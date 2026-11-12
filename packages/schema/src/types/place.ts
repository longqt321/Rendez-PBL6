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
export interface DailyPick {
  place: Place
  reason: string
}

/** Payload `GET /places/daily-picks` — `date` theo Asia/Ho_Chi_Minh (`YYYY-MM-DD`). */
export interface DailyPicks {
  date: string
  /** Tối đa 3 quán; rỗng khi job chưa chạy hoặc chưa đủ ứng viên. */
  items: DailyPick[]
}
