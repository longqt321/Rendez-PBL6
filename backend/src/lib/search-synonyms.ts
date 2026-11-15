const SYNONYMS: Record<string, string[]> = {
  // "quán ngon" — cách nói chung để tìm quán ăn.
  "quan ngon": ["quan an", "nha hang", "quan nhau"],
  // "ăn đêm" — nhóm hàng quán mở khuya.
  "an dem": ["quan nhau", "nuong", "lau"],
  // "cà phê" — tên quán trong corpus có khi viết "cafe"/"coffee".
  "ca phe": ["cafe", "coffee"],
  // "ăn sáng" — món sáng phổ biến ở Đà Nẵng.
  "an sang": ["pho", "banh mi", "bun", "chao"],
  // "hải sản" — corpus có cả nhãn tiếng Anh.
  "hai san": ["hai san", "seafood"],
  // "chay" — quán chay/vegetarian.
  chay: ["chay", "vegetarian"],
}

/**
 * Chuẩn hoá chuỗi tìm kiếm y hệt `immutable_search_normalize()` của Postgres
 * (migration 20261111090000): NFD bỏ dấu, `đ` → `d`, lowercase, ký tự không
 * phải chữ/số thành khoảng trắng, gộp khoảng trắng, trim.
 *
 * Chỉ dùng để TRA MAP và tách token ở JS — mọi so khớp thật vẫn do SQL làm
 * bằng chính hàm đó, nên hai bên không thể lệch nhau.
 */
export function normalizeSearchText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/đ/gu, "d")
    .replace(/Đ/gu, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
}

export function synonymVariants(normalizedPhrase: string): string[] {
  return SYNONYMS[normalizedPhrase] ?? []
}

export function allSynonyms(): Readonly<Record<string, string[]>> {
  return SYNONYMS
}
