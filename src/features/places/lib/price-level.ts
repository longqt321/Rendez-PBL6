import type { Place } from "../types/place"

/**
 * Mức giá của địa điểm — một nguồn duy nhất cho cả hiển thị và nhãn trợ năng.
 *
 * Trước đây `"₫".repeat(place.priceLevel)` bị copy ở 4 nơi (thẻ quán, bản đồ,
 * popup bản đồ, trang chi tiết) và mỗi nơi tự viết `aria-label` khác nhau.
 */
export function priceLevelLabel(priceLevel: Place["priceLevel"]): string {
  return "₫".repeat(priceLevel)
}

/** Nhãn đọc cho trình đọc màn hình: "Mức giá 2 trên 3". */
export function priceLevelAriaLabel(priceLevel: Place["priceLevel"]): string {
  return `Mức giá ${priceLevel} trên 3`
}
