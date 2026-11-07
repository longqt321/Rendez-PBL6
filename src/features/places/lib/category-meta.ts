import type { PlaceCategory } from "../types/place"

interface CategoryMeta {
  label: string
  /** Cụm từ dùng để so khớp với nội dung bài đăng (đã bỏ dấu, chữ thường) */
  keywords: string[]
}

export const CATEGORY_META: Record<PlaceCategory, CategoryMeta> = {
  cafe: { label: "Cà phê", keywords: ["ca phe", "cafe", "coffee", "quan nuoc"] },
  restaurant: {
    label: "Quán ăn",
    keywords: ["quan an", "nha hang", "an com", "com tam", "bun bo", "pho", "lau"],
  },
  "street-food": {
    label: "Ăn vặt",
    keywords: ["an vat", "banh mi", "banh canh", "banh khot", "xoi", "oc", "banh xeo"],
  },
  bakery: { label: "Tiệm bánh", keywords: ["tien banh", "banh ngot", "banh my", "bakery"] },
  dessert: { label: "Tráng miệng", keywords: ["che", "kem", "flan", "trang mieng"] },
  bar: { label: "Quán bar", keywords: ["bar", "bia", "cocktail", "rooftop", "pub"] },
}

export function categoryLabel(category: PlaceCategory): string {
  return CATEGORY_META[category].label
}
