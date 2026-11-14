/**
 * Ghép địa chỉ hiển thị từ `address` + `city` mà không lặp tên thành phố.
 *
 * Dữ liệu import có `address` đã chứa thành phố ở cuối ("52/8 Ông Ích Đường,
 * Cẩm Lệ, Đà Nẵng") hoặc trùng hẳn `city` ("Đà Nẵng") → nối thẳng sẽ thành
 * "…, Đà Nẵng, Đà Nẵng".
 */
export function formatLocation(address: string, city: string): string {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  // Bỏ các đoạn cuối trùng `city` (so sánh không phân biệt hoa/thường).
  while (parts.length > 0 && parts[parts.length - 1]?.toLowerCase() === city.trim().toLowerCase()) {
    parts.pop()
  }

  const cityTrimmed = city.trim()
  if (cityTrimmed.length === 0) return parts.join(", ")
  return [...parts, cityTrimmed].join(", ")
}
