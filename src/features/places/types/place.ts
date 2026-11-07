export type PlaceCategory = "cafe" | "restaurant" | "street-food" | "bakery" | "dessert" | "bar"

/** Địa điểm đầy đủ — dùng cho lưới /discover. */
export interface Place {
  id: string
  name: string
  address: string
  city: string
  category: PlaceCategory
  tags: string[]
  rating: number
  reviewCount: number
  priceLevel: 1 | 2 | 3
  imageSeed: string
  /** Chiều cao ảnh (px) cho bố cục masonry trên mobile */
  imageHeight: number
  /** Vĩ độ toạ độ địa lý (WGS84) */
  lat?: number
  /** Kinh độ toạ độ địa lý (WGS84) */
  lng?: number
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
  category: PlaceCategory
  imageSeed: string
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
