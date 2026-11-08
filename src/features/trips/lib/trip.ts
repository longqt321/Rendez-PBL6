import type { Trip, TripDay, TripStatus } from "@/features/trips/types/trip"

/** Định dạng ngày local chuẩn của feature: "YYYY-MM-DD". */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * "YYYY-MM-DD" → Date local (giờ 00:00). Trả null nếu chuỗi sai format/không hợp lệ.
 *
 * Kiểm tra round-trip sau khi dựng Date để bắt ngày không tồn tại (vd "2026-02-30"
 * bị cuộn sang tháng 3). Cố ý **không** dùng `Date.parse`/`toISOString` cho ngày
 * local vì cả hai hoạt động theo UTC, lệch múi giờ so với ngày người dùng chọn.
 */
export function parseLocalDate(iso: string): Date | null {
  if (!DATE_PATTERN.test(iso)) return null
  const year = Number(iso.slice(0, 4))
  const month = Number(iso.slice(5, 7))
  const day = Number(iso.slice(8, 10))
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

/**
 * Date → "YYYY-MM-DD" theo múi giờ LOCAL (không dùng toISOString — nó là UTC).
 */
export function toLocalDateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

/** Hôm nay theo local, dạng "YYYY-MM-DD". */
export function todayLocalDateString(): string {
  return toLocalDateString(new Date())
}

/**
 * Sinh TripDay[] từ startDate..endDate (bao cả 2 đầu); mỗi ngày kế thừa baseDistrict
 * nếu có. Trả mảng rỗng nếu một trong hai ngày không parse được hoặc start > end.
 */
export function generateDays(startDate: string, endDate: string, baseDistrict?: string): TripDay[] {
  const start = parseLocalDate(startDate)
  const end = parseLocalDate(endDate)
  if (!start || !end || start > end) return []

  const days: TripDay[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    days.push({ date: toLocalDateString(cursor), district: baseDistrict, placeIds: [] })
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

/**
 * Đổi khoảng ngày của chuyến đi:
 *
 * - Ngày còn nằm trong khoảng mới → GIỮ NGUYÊN nội dung (district, placeIds,
 *   budgetTier, note).
 * - Ngày mới thiếu → tạo rỗng, kế thừa baseDistrict (tham số override, fallback
 *   `trip.baseDistrict`).
 * - Ngày bị cắt → placeIds của ngày đó dồn vào unscheduledPlaceIds (dedup, giữ
 *   thứ tự), ngày bị xoá.
 *
 * Trả về Trip MỚI (không mutate) với `startDate`/`endDate` cập nhật theo khoảng
 * mới, giữ nguyên các trường còn lại. Khoảng ngày không hợp lệ thì trả về bản
 * sao nguyên trạng của `trip`.
 */
export function resizeDays(
  trip: Trip,
  startDate: string,
  endDate: string,
  baseDistrict?: string,
): Trip {
  const start = parseLocalDate(startDate)
  const end = parseLocalDate(endDate)
  if (!start || !end || start > end) return { ...trip }

  const existingByDate = new Map(trip.days.map((day) => [day.date, day]))
  const keptDates = new Set<string>()
  const days: TripDay[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    const date = toLocalDateString(cursor)
    keptDates.add(date)
    days.push(
      existingByDate.get(date) ?? {
        date,
        district: baseDistrict ?? trip.baseDistrict,
        placeIds: [],
      },
    )
    cursor.setDate(cursor.getDate() + 1)
  }

  const unscheduledPlaceIds = [...trip.unscheduledPlaceIds]
  for (const day of trip.days) {
    if (keptDates.has(day.date)) continue
    for (const placeId of day.placeIds) {
      if (!unscheduledPlaceIds.includes(placeId)) unscheduledPlaceIds.push(placeId)
    }
  }

  return { ...trip, startDate, endDate, days, unscheduledPlaceIds }
}

/**
 * So chuỗi "YYYY-MM-DD" (an toàn, không so Date/UTC): trước chuyến → "upcoming",
 * sau chuyến → "ended", trong chuyến → "ongoing". `today` mặc định hôm nay local.
 */
export function tripStatus(trip: Trip, today?: string): TripStatus {
  const now = today ?? todayLocalDateString()
  if (now < trip.startDate) return "upcoming"
  if (now > trip.endDate) return "ended"
  return "ongoing"
}

/**
 * Thống kê chuyến đi: `dayCount` = days.length; `placeCount` = tổng placeIds
 * trong days (KHÔNG tính unscheduled); `priceTierCounts` = đếm bậc giá theo
 * budgetTier của từng ngày.
 */
export function tripStats(trip: Trip): {
  dayCount: number
  placeCount: number
  priceTierCounts: { 1: number; 2: number; 3: number }
} {
  const priceTierCounts = { 1: 0, 2: 0, 3: 0 }
  let placeCount = 0
  for (const day of trip.days) {
    placeCount += day.placeIds.length
    if (day.budgetTier !== undefined) priceTierCounts[day.budgetTier] += 1
  }
  return { dayCount: trip.days.length, placeCount, priceTierCounts }
}
