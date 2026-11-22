import opening_hours from "opening_hours"

const DANANG_NOMINATIM = {
  lat: "16.0544",
  lon: "108.2022",
  address: { country_code: "vn", state: "Da Nang" },
}

/**
 * Việt Nam (Asia/Ho_Chi_Minh) cố định UTC+7 (không có DST).
 * Thư viện `opening_hours` đọc các field local (`getHours`, `getDay`, ...) của đối tượng `Date`,
 * nên cần quy đổi mốc thời gian về tường giờ VN để server UTC và client ở mọi múi giờ
 * cho ra kết quả nhất quán 100%.
 */
function toVietnamWallClockDate(date: Date): Date {
  const vnOffsetMs = 7 * 60 * 60 * 1000
  const localOffsetMs = -date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() + (vnOffsetMs - localOffsetMs))
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
