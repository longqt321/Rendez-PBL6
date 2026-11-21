export const DANANG_DISTRICTS = [
  "Hải Châu",
  "Thanh Khê",
  "Sơn Trà",
  "Ngũ Hành Sơn",
  "Liên Chiểu",
  "Cẩm Lệ",
] as const

export const DANANG_DISTRICT_CENTERS: Readonly<Record<string, [number, number]>> = {
  "Hải Châu": [16.061, 108.219],
  "Thanh Khê": [16.066, 108.194],
  "Sơn Trà": [16.082, 108.244],
  "Ngũ Hành Sơn": [16.032, 108.251],
  "Liên Chiểu": [16.077, 108.151],
  "Cẩm Lệ": [16.017, 108.198],
}

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
