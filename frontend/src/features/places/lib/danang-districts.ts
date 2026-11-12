/**
 * Bộ lọc quận của Đà Nẵng — CHỈ 6 quận trực thuộc thành phố.
 *
 * Đà Nẵng có 8 đơn vị cấp huyện (6 quận + 2 huyện Hòa Vang, Hoàng Sa), nhưng
 * ứng dụng chỉ lọc theo 6 quận: 2 huyện gần như không có quán trong dữ liệu
 * (Hòa Vang 2/344, Hoàng Sa 0) — chọn chúng chỉ ra danh sách/map rỗng, người
 * dùng tưởng app lỗi. POI thuộc 2 huyện được corpus gán về quận gần nhất.
 *
 * Đồng bộ với `build-corpus` (`districtCanonical`) và seed backend: các tên cũ
 * (An Hải, Hòa Cường, Hòa Khánh, Hòa Xuân, An Khê, Hải Vân) đã được gộp/sửa
 * trong DB nên KHÔNG nằm ở đây nữa.
 */
export const DANANG_DISTRICTS = [
  "Hải Châu",
  "Thanh Khê",
  "Sơn Trà",
  "Ngũ Hành Sơn",
  "Liên Chiểu",
  "Cẩm Lệ",
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
