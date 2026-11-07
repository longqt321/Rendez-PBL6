import type { PlaceCategory } from "../types/place"

interface CategoryMeta {
  label: string
}

/**
 * Nhãn hiển thị của loại hình địa điểm.
 *
 * Chỉ chứa dữ liệu để hiển thị. Các từ khoá dùng cho việc so khớp/xếp hạng
 * thuộc về server (`src/mocks/ranking.ts`), không nằm ở đây.
 */
export const CATEGORY_META: Record<PlaceCategory, CategoryMeta> = {
  cafe: { label: "Cà phê" },
  restaurant: { label: "Quán ăn" },
  "street-food": { label: "Ăn vặt" },
  bakery: { label: "Tiệm bánh" },
  dessert: { label: "Tráng miệng" },
  bar: { label: "Quán bar" },
}

export function categoryLabel(category: PlaceCategory): string {
  return CATEGORY_META[category].label
}
