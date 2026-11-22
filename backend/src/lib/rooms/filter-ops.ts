import type { RoomFilter, RoomProposalField } from "@rendez/schema"
import { CATEGORY_LABEL, parseApiCategory } from "../enums"

export function normalizeProposalValue(field: RoomProposalField, value: string): string | null {
  if (field === "category") return parseApiCategory(value)
  if (field === "priceMax") return value === "1" || value === "2" || value === "3" ? value : null
  return value
}

export function removeFilterConstraint(
  filter: RoomFilter,
  target: { kind: "include" | "exclude"; field: RoomProposalField; value: string },
): RoomFilter {
  const value = target.value.trim()
  if (target.field === "category") {
    const category = parseApiCategory(value)
    if (!category) return filter
    return target.kind === "include"
      ? { ...filter, categories: filter.categories.filter((c) => c !== category) }
      : { ...filter, excludedCategories: filter.excludedCategories.filter((c) => c !== category) }
  }
  if (target.field === "district") {
    return target.kind === "include"
      ? { ...filter, districts: filter.districts.filter((d) => d !== value) }
      : { ...filter, excludedDistricts: filter.excludedDistricts.filter((d) => d !== value) }
  }
  if (target.field === "priceMax") {
    const rest = { ...filter }
    delete rest.priceMax
    return rest
  }
  return target.kind === "include"
    ? { ...filter, includeKeywords: filter.includeKeywords.filter((k) => k !== value) }
    : { ...filter, excludeKeywords: filter.excludeKeywords.filter((k) => k !== value) }
}

function hasFilterConstraint(
  filter: RoomFilter,
  target: { kind: "include" | "exclude"; field: RoomProposalField; value: string },
): boolean {
  const value = target.value.trim()
  if (target.field === "category") {
    const category = parseApiCategory(value)
    if (!category) return false
    return target.kind === "include"
      ? filter.categories.includes(category)
      : filter.excludedCategories.includes(category)
  }
  if (target.field === "district") {
    return target.kind === "include"
      ? filter.districts.includes(value)
      : filter.excludedDistricts.includes(value)
  }
  if (target.field === "priceMax") {
    return filter.priceMax !== undefined && String(filter.priceMax) === value
  }
  return target.kind === "include"
    ? filter.includeKeywords.includes(value)
    : filter.excludeKeywords.includes(value)
}

export function toggleFilterConstraint(
  filter: RoomFilter,
  target: { kind: "include" | "exclude"; field: RoomProposalField; value: string },
): RoomFilter {
  return hasFilterConstraint(filter, target)
    ? removeFilterConstraint(filter, target)
    : applyProposalToFilter(filter, target)
}

export function applyProposalToFilter(
  filter: RoomFilter,
  proposal: { kind: "include" | "exclude"; field: RoomProposalField; value: string },
): RoomFilter {
  const value = proposal.value

  if (proposal.field === "category") {
    // Giá trị lạ (dữ liệu cũ) bị bỏ qua — không ép kiểu mù vào enum.
    const category = parseApiCategory(value)
    if (!category) return filter
    return proposal.kind === "include"
      ? {
          ...filter,
          categories: [...new Set([...filter.categories, category])],
          excludedCategories: filter.excludedCategories.filter((item) => item !== category),
        }
      : {
          ...filter,
          excludedCategories: [...new Set([...filter.excludedCategories, category])],
          categories: filter.categories.filter((item) => item !== category),
        }
  }

  if (proposal.field === "district") {
    return proposal.kind === "include"
      ? {
          ...filter,
          districts: [...new Set([...filter.districts, value])],
          excludedDistricts: filter.excludedDistricts.filter((item) => item !== value),
        }
      : {
          ...filter,
          excludedDistricts: [...new Set([...filter.excludedDistricts, value])],
          districts: filter.districts.filter((item) => item !== value),
        }
  }

  if (proposal.field === "priceMax") {
    // "exclude" với mức giá không có nghĩa — chỉ ghi nhận khi là include.
    if (proposal.kind !== "include") return filter
    const parsed = Number(value)
    // Giá trị lạ (dữ liệu cũ) KHÔNG được tự quy về 3 — bỏ qua đề xuất thay vì
    // âm thầm áp một mức giá người dùng không chọn.
    if (parsed !== 1 && parsed !== 2 && parsed !== 3) return filter
    return { ...filter, priceMax: parsed }
  }

  return proposal.kind === "include"
    ? { ...filter, includeKeywords: [...new Set([...filter.includeKeywords, value])] }
    : { ...filter, excludeKeywords: [...new Set([...filter.excludeKeywords, value])] }
}

export function describeProposal(proposal: {
  kind: "include" | "exclude"
  field: RoomProposalField
  value: string
}): string {
  const sign = proposal.kind === "include" ? "＋" : "－"
  if (proposal.field === "category") {
    const category = parseApiCategory(proposal.value)
    return `${sign} Loại hình: ${category ? CATEGORY_LABEL[category] : proposal.value}`
  }
  if (proposal.field === "district") return `${sign} Quận: ${proposal.value}`
  if (proposal.field === "priceMax") {
    // Giá trị lạ thì hiện "—" — KHÔNG tự quy về 3 (trái với applyProposalToFilter,
    // nơi giá trị lạ bị bỏ qua; mô tả phải phản ánh đúng điều đã xảy ra).
    const level = Number(proposal.value)
    const label = level === 1 || level === 2 || level === 3 ? "₫".repeat(level) : "—"
    return `＋ Mức giá tối đa: ${label}`
  }
  return `${sign} Từ khoá: ${proposal.value}`
}
