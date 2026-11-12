/**
 * Từ đồng nghĩa tiếng Việt cho tìm kiếm địa điểm (`GET /places?q=`).
 *
 * Nguồn gốc: tập từ khoá người dùng thật sự gõ trong demo (khảo sát nội bộ
 * nhóm sản phẩm, 2026-11-12) — mỗi khoá gốc là cách nói phổ biến, giá trị là
 * các biến thể mà corpus OSM/curated thật sự dùng trong `name`/`tags`.
 *
 * Quy ước: khoá và giá trị đều ở dạng ĐÃ CHUẨN HOÁ (bỏ dấu, lowercase, dấu câu
 * → khoảng trắng) — cùng quy tắc `immutable_search_normalize()` của Postgres và
 * `normalizeSearchText()` bên dưới. Nhờ vậy tra map chỉ cần chuỗi đã chuẩn hoá,
 * không phải xử lý dấu ở từng nhánh SQL.
 *
 * Chỉ mở rộng truy vấn (OR thêm biến thể), KHÔNG thay thế từ khoá gốc: người
 * dùng gõ "quán ngon" vẫn phải thấy quán tên đúng "Quán Ngon" nếu có.
 */
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

/** Các biến thể của MỘT cụm từ đã chuẩn hoá; mảng rỗng khi không có trong map. */
export function synonymVariants(normalizedPhrase: string): string[] {
  return SYNONYMS[normalizedPhrase] ?? []
}

/** Toàn bộ map (chỉ đọc) — test dùng để kiểm tính nhất quán của dữ liệu. */
export function allSynonyms(): Readonly<Record<string, string[]>> {
  return SYNONYMS
}
