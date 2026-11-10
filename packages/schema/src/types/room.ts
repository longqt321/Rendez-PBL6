import type { PlaceCategory } from "./place"

/**
 * Phòng lọc nhóm — hợp đồng mới của backend (Phase 6).
 *
 * Trước Phase 6 phòng chỉ sống trong trình duyệt (localStorage + BroadcastChannel)
 * nên không có endpoint. Khi có backend, cùng shape này được lưu ở Postgres và
 * đẩy cho mọi thành viên qua SSE; client giữ nguyên cách hiển thị.
 */

/** Một thành viên trong phòng. */
export interface RoomMember {
  id: string
  displayName: string
  /** `true` cho chính người đang gọi — client hiện "Bạn" thay vì tên. */
  isMe: boolean
  joinedAt: string
}

/** Chiều dữ liệu mà một đề xuất tác động. */
export type RoomProposalField = "category" | "district" | "priceMax" | "keyword"

/** Đề xuất include/exclude của một thành viên. */
export interface RoomProposal {
  id: string
  memberId: string
  kind: "include" | "exclude"
  field: RoomProposalField
  /** Giá trị thô: mã loại hình, tên quận, "1"|"2"|"3", hoặc từ khoá. */
  value: string
  status: "open" | "applied" | "dismissed"
  createdAt: string
}

/** Bộ lọc chung của phòng — chỉ dùng dữ liệu `Place` đang có. */
export interface RoomFilter {
  categories: PlaceCategory[]
  excludedCategories: PlaceCategory[]
  districts: string[]
  excludedDistricts: string[]
  includeKeywords: string[]
  excludeKeywords: string[]
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

/** Kết quả áp dụng một đề xuất — kèm mô tả ngắn để hiện toast. */
export interface AppliedProposalResult {
  room: Room
  summary: string
}
