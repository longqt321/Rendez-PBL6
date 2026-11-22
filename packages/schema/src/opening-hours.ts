import opening_hours from "opening_hours"

const DANANG_NOMINATIM = {
  lat: "16.0544",
  lon: "108.2022",
  address: { country_code: "vn", state: "Da Nang" },
}

const VN_WALL_CLOCK_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
})

/**
 * Thư viện `opening_hours` đọc các field local (`getHours`, `getDay`, ...) của đối tượng `Date`.
 * Quy đổi tường giờ theo múi giờ chuẩn `Asia/Ho_Chi_Minh` bằng `Intl.DateTimeFormat`
 * để server UTC và client ở mọi múi giờ/DST cho ra kết quả nhất quán 100%.
 */
function toVietnamWallClockDate(date: Date): Date {
  const parts = VN_WALL_CLOCK_FORMAT.formatToParts(date)
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0)
  return new Date(
    pick("year"),
    pick("month") - 1,
    pick("day"),
    pick("hour"),
    pick("minute"),
    pick("second"),
  )
}

export function isOpenNow(openingHours: string | null, now: Date = new Date()): boolean | null {
  if (!openingHours) return null
  const normalized = openingHours.trim()
  if (!normalized) return null
  if (normalized === "24/7") return true

  // Chuẩn hóa HH:MM:SS -> HH:MM (OSM opening_hours chuẩn dùng HH:MM)
  const sanitized = normalized.replace(/(\d{1,2}:\d{2}):\d{2}/gu, "$1")

  // Các chuỗi thiếu khung giờ cụ thể (ví dụ chỉ có "mo-tu" hoặc "08:00" không có khoảng) -> trả null thay vì suy diễn
  if (!/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/u.test(sanitized)) {
    return null
  }

  try {
    const oh = new opening_hours(sanitized, DANANG_NOMINATIM)
    return oh.getState(toVietnamWallClockDate(now))
  } catch {
    return null
  }
}
