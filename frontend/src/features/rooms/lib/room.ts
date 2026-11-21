import { parseNaturalFilterQuery } from "@rendez/schema"
import { categoryLabel } from "@/features/places/lib/category-meta"
import { priceLevelLabel } from "@/features/places/lib/price-level"
import type { PlaceCategory } from "@/features/places/types/place"
import { MAX_ROOM_KEYWORD_LENGTH } from "@/lib/constants"
import type { Room, RoomProposal, RoomProposalField } from "../types/room"

export const ACTIVE_ROOM_KEY = "danang-room-active"

export interface RoomFilterChip {
  kind: "include" | "exclude"
  field: RoomProposalField
  value: string
  label: string
}

export interface ParsedRoomProposalInput {
  kind: "include" | "exclude"
  field: RoomProposalField
  value: string
}

/** Xoá mã phòng lọc đang hoạt động khỏi sessionStorage và đồng bộ `useRooms` trong cùng tab. */
export function clearActiveRoom(): void {
  try {
    if (typeof window === "undefined") return
    window.sessionStorage.removeItem(ACTIVE_ROOM_KEY)
    window.dispatchEvent(new StorageEvent("storage", { key: ACTIVE_ROOM_KEY, newValue: null }))
  } catch {
    // Storage bị chặn hoặc môi trường không có window - bỏ qua.
  }
}

export function describeProposal(proposal: Pick<RoomProposal, "kind" | "field" | "value">): string {
  const sign = proposal.kind === "include" ? "＋" : "－"
  if (proposal.field === "category")
    return `${sign} Loại hình: ${categoryLabel(proposal.value as PlaceCategory)}`
  if (proposal.field === "district") return `${sign} Quận: ${proposal.value}`
  if (proposal.field === "priceMax") {
    const level = Number(proposal.value)
    // Giá trị lạ thì hiện "—" - không tự quy về mức 3 (khớp backend).
    const label = level === 1 || level === 2 || level === 3 ? priceLevelLabel(level) : "—"
    return `＋ Mức giá tối đa: ${label}`
  }
  return `${sign} Từ khoá: ${proposal.value}`
}

export function roomFilterChips(room: Room): RoomFilterChip[] {
  const { filter } = room
  const chips: RoomFilterChip[] = []
  for (const category of filter.categories) {
    chips.push({
      kind: "include",
      field: "category",
      value: category,
      label: categoryLabel(category),
    })
  }
  for (const category of filter.excludedCategories) {
    chips.push({
      kind: "exclude",
      field: "category",
      value: category,
      label: `Không ${categoryLabel(category).toLowerCase()}`,
    })
  }
  for (const district of filter.districts) {
    chips.push({
      kind: "include",
      field: "district",
      value: district,
      label: district,
    })
  }
  for (const district of filter.excludedDistricts) {
    chips.push({
      kind: "exclude",
      field: "district",
      value: district,
      label: `Không ${district}`,
    })
  }
  if (filter.priceMax !== undefined) {
    chips.push({
      kind: "include",
      field: "priceMax",
      value: String(filter.priceMax),
      label: `Tối đa ${priceLevelLabel(filter.priceMax)}`,
    })
  }
  for (const keyword of filter.includeKeywords) {
    chips.push({
      kind: "include",
      field: "keyword",
      value: keyword,
      label: `Có “${keyword}”`,
    })
  }
  for (const keyword of filter.excludeKeywords) {
    chips.push({
      kind: "exclude",
      field: "keyword",
      value: keyword,
      label: `Không “${keyword}”`,
    })
  }
  return chips
}

/**
 * Chuyển đổi câu gõ tự nhiên của thành viên thành danh sách các đề xuất phòng có cấu trúc.
 * Hỗ trợ dấu phẩy để tách nhiều từ khoá (VD: "cà phê Sơn Trà, yên tĩnh, không hải sản").
 */
export function naturalQueryToProposalInputs(rawInput: string): ParsedRoomProposalInput[] {
  const trimmed = rawInput.trim()
  if (!trimmed) return []

  const results: ParsedRoomProposalInput[] = []
  const seen = new Set<string>()
  const push = (item: ParsedRoomProposalInput) => {
    const cleanValue = item.value.trim().slice(0, MAX_ROOM_KEYWORD_LENGTH)
    if (!cleanValue) return
    const key = `${item.kind}:${item.field}:${cleanValue.toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)
    results.push({ ...item, value: cleanValue })
  }

  // Tách theo dấu phẩy/chấm phẩy để xử lý chính xác nhiều vế ("yên tĩnh, view biển")
  const clauses = trimmed
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  for (const clause of clauses) {
    const parsed = parseNaturalFilterQuery(clause)
    for (const category of parsed.categories) {
      push({ kind: "include", field: "category", value: category })
    }
    for (const category of parsed.excludeCategories) {
      push({ kind: "exclude", field: "category", value: category })
    }
    for (const district of parsed.districts) {
      push({ kind: "include", field: "district", value: district })
    }
    for (const district of parsed.excludeDistricts) {
      push({ kind: "exclude", field: "district", value: district })
    }
    if (parsed.priceMax !== undefined) {
      push({ kind: "include", field: "priceMax", value: String(parsed.priceMax) })
    }
    for (const kw of parsed.excludeKeywords) {
      push({ kind: "exclude", field: "keyword", value: kw })
    }
    if (parsed.residualQuery) {
      push({ kind: "include", field: "keyword", value: parsed.residualQuery })
    }
  }

  return results
}
