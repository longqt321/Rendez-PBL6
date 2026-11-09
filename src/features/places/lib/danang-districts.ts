/**
 * Danh sách phường/khu vực dùng trong dataset cold-start (đơn vị hành chính
 * 2025 sau sáp nhập, theo Nominatim — xem D-046). Sắp theo số địa điểm giảm dần.
 */
export const DANANG_DISTRICTS = [
  "Hải Châu",
  "Ngũ Hành Sơn",
  "An Hải",
  "Thanh Khê",
  "Hòa Cường",
  "Sơn Trà",
  "Cẩm Lệ",
  "Liên Chiểu",
  "Hòa Khánh",
  "Hòa Xuân",
  "An Khê",
  "Hải Vân",
] as const

/**
 * Khoảng cách đường chim bay giữa hai toạ độ (km) — công thức Haversine.
 *
 * Cố ý **không** dùng `L.latLng(a).distanceTo(b)` của Leaflet: helper này còn
 * được gọi ở dạng danh sách (`/discover` grid, `PlaceCard`) nơi Leaflet chưa
 * được nạp; kéo Leaflet vào đó sẽ tăng bundle mà không có lợi ích.
 */
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371 // Bán kính trái đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
