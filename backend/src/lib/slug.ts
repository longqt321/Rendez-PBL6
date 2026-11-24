/**
 * Sinh slug chuẩn hóa từ chuỗi tiếng Việt (bỏ dấu, chuyển khoảng trắng và ký tự đặc biệt thành gạch ngang).
 */
export function slugify(text: string, maxLength = 40): string {
  const base = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)

  return base || "item"
}
