import type { Place } from "../types/place"

export function priceLevelLabel(priceLevel: Place["priceLevel"]): string {
  if (priceLevel == null) return "Chưa có giá"
  return "₫".repeat(priceLevel)
}

export function priceLevelAriaLabel(priceLevel: Place["priceLevel"]): string {
  if (priceLevel == null) return "Chưa có thông tin mức giá"
  return `Mức giá ${priceLevel} trên 3`
}
