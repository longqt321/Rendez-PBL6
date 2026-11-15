import type { Place } from "../types/place"

export function priceLevelLabel(priceLevel: Place["priceLevel"]): string {
  return "₫".repeat(priceLevel)
}

export function priceLevelAriaLabel(priceLevel: Place["priceLevel"]): string {
  return `Mức giá ${priceLevel} trên 3`
}
