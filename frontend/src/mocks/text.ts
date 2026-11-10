/**
 * Chuẩn hoá chuỗi tiếng Việt để so khớp không phân biệt dấu.
 *
 * Chỉ dùng phía server (mock). Frontend không gọi hàm này.
 */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}
