import { categoryLabel } from "@/features/places/lib/category-meta"
import { priceLevelLabel } from "@/features/places/lib/price-level"
import type { PlaceCategory } from "@/features/places/types/place"
import type { RoomProposal } from "../types/room"

export function describeProposal(proposal: RoomProposal): string {
  const sign = proposal.kind === "include" ? "＋" : "－"
  if (proposal.field === "category")
    return `${sign} Loại hình: ${categoryLabel(proposal.value as PlaceCategory)}`
  if (proposal.field === "district") return `${sign} Quận: ${proposal.value}`
  if (proposal.field === "priceMax") {
    const level = Number(proposal.value)
    // Giá trị lạ thì hiện "—" — không tự quy về mức 3 (khớp backend).
    const label = level === 1 || level === 2 || level === 3 ? priceLevelLabel(level) : "—"
    return `＋ Mức giá tối đa: ${label}`
  }
  return `${sign} Từ khoá: ${proposal.value}`
}
