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
