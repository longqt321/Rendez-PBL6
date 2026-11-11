import type { PlaceCategory } from "../types/place"

interface CategoryMeta {
  label: string
  /**
   * Màu chủ đạo của pin trên bản đồ (hex). Dùng inline style trong `divIcon`
   * vì pin là chuỗi HTML dựng lúc runtime — class màu của Tailwind sẽ không
   * được quét nếu chỉ xuất hiện trong chuỗi template.
   */
  color: string
  /**
   * Nội dung SVG (lucide, stroke theo `currentColor`) vẽ trong pin — pin nhìn
   * là biết quán gì mà không cần đọc chữ.
   */
  icon: string
}

/**
 * Nhãn hiển thị của loại hình địa điểm.
 *
 * Chỉ chứa dữ liệu để hiển thị. Các từ khoá dùng cho việc so khớp/xếp hạng
 * thuộc về server (`src/mocks/ranking.ts`), không nằm ở đây.
 */
export const CATEGORY_META: Record<PlaceCategory, CategoryMeta> = {
  cafe: {
    label: "Cà phê",
    color: "#b45309",
    icon: `<path d="M10 2v2" /><path d="M14 2v2" /><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" /><path d="M6 2v2" />`,
  },
  restaurant: {
    label: "Quán ăn",
    color: "#dc2626",
    icon: `<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />`,
  },
  "street-food": {
    label: "Ăn vặt",
    color: "#ea580c",
    icon: `<path d="m2.37 11.223 8.372-6.777a2 2 0 0 1 2.516 0l8.371 6.777" /><path d="M21 15a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-5.25" /><path d="M3 15a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h9" /><path d="m6.67 15 6.13 4.6a2 2 0 0 0 2.8-.4l3.15-4.2" />`,
  },
  bakery: {
    label: "Tiệm bánh",
    color: "#ca8a04",
    icon: `<path d="M10.2 18H4.774a1.5 1.5 0 0 1-1.352-.97 11 11 0 0 1 .132-6.487" /><path d="M18 10.2V4.774a1.5 1.5 0 0 0-.97-1.352 11 11 0 0 0-6.486.132" /><path d="M18 5a4 3 0 0 1 4 3 2 2 0 0 1-2 2 10 10 0 0 0-5.139 1.42" /><path d="M5 18a3 4 0 0 0 3 4 2 2 0 0 0 2-2 10 10 0 0 1 1.42-5.14" /><path d="M8.709 2.554a10 10 0 0 0-6.155 6.155 1.5 1.5 0 0 0 .676 1.626l9.807 5.42a2 2 0 0 0 2.718-2.718l-5.42-9.807a1.5 1.5 0 0 0-1.626-.676" />`,
  },
  dessert: {
    label: "Tráng miệng",
    color: "#db2777",
    icon: `<path d="M16 13H3" /><path d="M16 17H3" /><path d="m7.2 7.9-3.388 2.5A2 2 0 0 0 3 12.01V20a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-8.654c0-2-2.44-6.026-6.44-8.026a1 1 0 0 0-1.082.057L10.4 5.6" />`,
  },
  bar: {
    label: "Quán bar",
    color: "#7c3aed",
    icon: `<path d="M8 22h8" /><path d="M7 10h10" /><path d="M12 15v7" /><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z" />`,
  },
}

export function categoryLabel(category: PlaceCategory): string {
  return CATEGORY_META[category].label
}

/**
 * SVG hoàn chỉnh của icon category — dùng trong pin trên bản đồ (`divIcon`
 * chỉ nhận chuỗi HTML) và trong legend. `currentColor` ăn theo màu chữ của
 * phần tử bọc ngoài.
 */
export function categoryIconSvg(category: PlaceCategory, size = 14): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CATEGORY_META[category].icon}</svg>`
}
