export const DANANG_DISTRICTS = [
  "Hải Châu",
  "Sơn Trà",
  "Ngũ Hành Sơn",
  "Thanh Khê",
  "Cẩm Lệ",
  "Liên Chiểu",
] as const

export type DanangDistrict = (typeof DANANG_DISTRICTS)[number]

/**
 * Tính khoảng cách đường chim bay giữa hai toạ độ theo công thức Haversine (km).
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

/**
 * Định dạng khoảng cách thân thiện: < 1km hiện theo mét (vd: 350 m), >= 1km hiện số thập phân (vd: 1.2 km).
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000)
    return `${meters} m`
  }
  return `${distanceKm.toFixed(1)} km`
}
