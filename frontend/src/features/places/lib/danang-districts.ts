import { DANANG_DISTRICTS_CANONICAL } from "@rendez/schema"
import distance from "@turf/distance"
import { point } from "@turf/helpers"

export const DANANG_DISTRICTS = DANANG_DISTRICTS_CANONICAL

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
  return distance(point([lng1, lat1]), point([lng2, lat2]), { units: "kilometers" })
}
