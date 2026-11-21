import { categoryLabel } from "@/features/places/lib/category-meta"
import { priceLevelLabel } from "@/features/places/lib/price-level"
import type { PlaceCategory } from "@/features/places/types/place"
import type { Room, RoomProposal } from "../types/room"

export const ACTIVE_ROOM_KEY = "danang-room-active"

export interface RoomFilterChip {
  label: string
  kind: "include" | "exclude"
}

/** Xoá mã phòng lọc đang hoạt động khỏi sessionStorage và đồng bộ `useRooms` trong cùng tab. */
export function clearActiveRoom(): void {
  try {
    if (typeof window === "undefined") return
    window.sessionStorage.removeItem(ACTIVE_ROOM_KEY)
    window.dispatchEvent(new StorageEvent("storage", { key: ACTIVE_ROOM_KEY, newValue: null }))
  } catch {
    // Storage bị chặn hoặc môi trường không có window — bỏ qua.
  }
}

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

export function roomFilterChips(room: Room): RoomFilterChip[] {
  const { filter } = room
  const chips: RoomFilterChip[] = []
  for (const category of filter.categories) {
    chips.push({ kind: "include", label: categoryLabel(category) })
  }
  for (const category of filter.excludedCategories) {
    chips.push({ kind: "exclude", label: `Không ${categoryLabel(category).toLowerCase()}` })
  }
  for (const district of filter.districts) {
    chips.push({ kind: "include", label: district })
  }
  for (const district of filter.excludedDistricts) {
    chips.push({ kind: "exclude", label: `Không ${district}` })
  }
  if (filter.priceMax !== undefined) {
    chips.push({ kind: "include", label: `Tối đa ${priceLevelLabel(filter.priceMax)}` })
  }
  for (const keyword of filter.includeKeywords) {
    chips.push({ kind: "include", label: `Có “${keyword}”` })
  }
  for (const keyword of filter.excludeKeywords) {
    chips.push({ kind: "exclude", label: `Không “${keyword}”` })
  }
  return chips
}
