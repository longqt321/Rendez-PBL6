import type { PlaceCategory } from "@/features/places/types/place"

/** Một thành viên trong phòng lọc. */
export interface RoomMember {
  id: string
  displayName: string
  /** `true` cho chính người dùng hiện tại — dùng để hiện "Bạn" thay vì tên. */
  isMe: boolean
  joinedAt: string
}

/** Chiều dữ liệu mà một đề xuất tác động. */
export type RoomProposalField = "category" | "district" | "priceMax" | "keyword"

/** Một đề xuất include/exclude của thành viên. */
export interface RoomProposal {
  id: string
  memberId: string
  /** `include` = muốn có; `exclude` = muốn loại bỏ. */
  kind: "include" | "exclude"
  field: RoomProposalField
  /** Giá trị thô: mã loại hình, tên quận, "1"|"2"|"3" cho mức giá, hoặc từ khoá. */
  value: string
  status: "open" | "applied" | "dismissed"
  createdAt: string
}

/**
 * Bộ lọc chung của phòng — chỉ dùng dữ liệu `Place` đang có
 * (`category`, `district`, `priceLevel`, `name`, `tags`).
 */
export interface RoomFilter {
  /** Loại hình được chọn; rỗng = không giới hạn. */
  categories: PlaceCategory[]
  excludedCategories: PlaceCategory[]
  /** Quận được chọn; rỗng = không giới hạn. */
  districts: string[]
  excludedDistricts: string[]
  /** Từ khoá phải xuất hiện trong tên hoặc tag. */
  includeKeywords: string[]
  /** Từ khoá bị loại nếu xuất hiện trong tên hoặc tag. */
  excludeKeywords: string[]
  /** Mức giá cao nhất chấp nhận; `undefined` = không giới hạn. */
  priceMax?: 1 | 2 | 3
}

/** Phòng lọc nhóm. */
export interface Room {
  id: string
  /** Mã 6 ký tự, cũng là đường dẫn `/rooms/:code`. */
  code: string
  name: string
  members: RoomMember[]
  proposals: RoomProposal[]
  filter: RoomFilter
  createdAt: string
}

/** Kết quả một đề xuất đã được áp dụng — dùng để hiện toast "vì sao filter đổi". */
export interface AppliedProposalResult {
  room: Room
  /** Mô tả ngắn để hiện cho người dùng, vd "Đã thêm loại hình Cà phê". */
  summary: string
}
