import { categoryLabel } from "@/features/places/lib/category-meta"
import { priceLevelLabel } from "@/features/places/lib/price-level"
import type { PlaceCategory } from "@/features/places/types/place"
import type { RoomProposal } from "../types/room"

/**
 * Chuỗi mô tả một đề xuất, dùng cho danh sách đề xuất — vd "＋ Loại hình: Cà phê".
 *
 * Toast khi áp đề xuất dùng `summary` do server trả (một nguồn sự thật); hàm
 * này chỉ phục vụ hiển thị danh sách trên client.
 */
export function describeProposal(proposal: RoomProposal): string {
  const sign = proposal.kind === "include" ? "＋" : "－"
  if (proposal.field === "category")
    return `${sign} Loại hình: ${categoryLabel(proposal.value as PlaceCategory)}`
  if (proposal.field === "district") return `${sign} Quận: ${proposal.value}`
  if (proposal.field === "priceMax") {
    const level = Number(proposal.value)
    // Giá trị lạ thì hiện "—" — không tự quy về mức 3 (khớp backend).
    const label =
      level === 1 || level === 2 || level === 3 ? priceLevelLabel(level as 1 | 2 | 3) : "—"
    return `＋ Mức giá tối đa: ${label}`
  }
  return `${sign} Từ khoá: ${proposal.value}`
}
