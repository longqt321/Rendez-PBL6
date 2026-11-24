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

  // Chuẩn hóa HH:MM:SS -> HH:MM và cú pháp mở tiếp HH:MM+ -> HH:MM-24:00 (OSM opening_hours)
  const sanitized = normalized
    .replace(/(\d{1,2}:\d{2}):\d{2}/gu, "$1")
    .replace(/(\d{1,2}:\d{2})\s*\+/gu, "$1-24:00")

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

export interface OpeningHoursDetail {
  isOpen: boolean | null
  closingSoon: boolean
  statusLabel: string
  nextChange: string | null
  weeklySchedule: { dayLabel: string; hours: string; isToday: boolean }[]
}

const DAY_LABELS = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"]

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0")
  const m = String(date.getMinutes()).padStart(2, "0")
  return `${h}:${m}`
}

export function getOpeningHoursDetail(
  openingHours: string | null,
  now: Date = new Date(),
): OpeningHoursDetail {
  if (!openingHours || !openingHours.trim()) {
    return {
      isOpen: null,
      closingSoon: false,
      statusLabel: "Chưa có giờ mở cửa",
      nextChange: null,
      weeklySchedule: [],
    }
  }

  const normalized = openingHours.trim()
  if (normalized === "24/7") {
    const weeklySchedule = DAY_LABELS.map((dayLabel, idx) => ({
      dayLabel,
      hours: "Mở cả ngày (24/7)",
      isToday: idx === now.getDay(),
    }))
    return {
      isOpen: true,
      closingSoon: false,
      statusLabel: "Mở 24/7",
      nextChange: null,
      weeklySchedule,
    }
  }

  const sanitized = normalized
    .replace(/(\d{1,2}:\d{2}):\d{2}/gu, "$1")
    .replace(/(\d{1,2}:\d{2})\s*\+/gu, "$1-24:00")

  if (!/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/u.test(sanitized)) {
    return {
      isOpen: null,
      closingSoon: false,
      statusLabel: normalized,
      nextChange: null,
      weeklySchedule: [],
    }
  }

  try {
    const oh = new opening_hours(sanitized, DANANG_NOMINATIM)
    const wallNow = toVietnamWallClockDate(now)
    const isOpen = oh.getState(wallNow)
    const nextChangeDate = oh.getNextChange(wallNow)
    let closingSoon = false
    let statusLabel = isOpen ? "Đang mở cửa" : "Đã đóng cửa"
    let nextChange: string | null = null

    if (nextChangeDate) {
      nextChange = formatTime(nextChangeDate)
      const diffMs = nextChangeDate.getTime() - wallNow.getTime()
      const diffMins = Math.round(diffMs / 60_000)

      if (isOpen) {
        if (diffMins > 0 && diffMins <= 45) {
          closingSoon = true
          statusLabel = `Sắp đóng trong ${diffMins} phút`
        } else {
          statusLabel = `Đang mở · Đóng lúc ${nextChange}`
        }
      } else {
        const isSameDay = nextChangeDate.getDate() === wallNow.getDate()
        if (isSameDay) {
          statusLabel = `Đã đóng · Mở lại ${nextChange}`
        } else {
          statusLabel = `Đã đóng · Mở lại ${nextChange} mai`
        }
      }
    }

    const weeklySchedule: { dayLabel: string; hours: string; isToday: boolean }[] = []
    const currentDay = wallNow.getDay()
    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
      const testDate = new Date(wallNow)
      testDate.setDate(wallNow.getDate() - currentDay + dayOffset)
      testDate.setHours(0, 0, 0, 0)
      const endOfDay = new Date(testDate)
      endOfDay.setHours(23, 59, 59, 999)

      let hoursText = "Nghỉ"
      try {
        const intervals = oh.getOpenIntervals(testDate, endOfDay)
        if (intervals.length > 0) {
          hoursText = intervals
            .map(([from, to]) => `${formatTime(from)} - ${formatTime(to)}`)
            .join(", ")
        }
      } catch {
        hoursText = sanitized
      }

      weeklySchedule.push({
        dayLabel: DAY_LABELS[dayOffset]!,
        hours: hoursText,
        isToday: dayOffset === currentDay,
      })
    }

    return {
      isOpen,
      closingSoon,
      statusLabel,
      nextChange,
      weeklySchedule,
    }
  } catch {
    return {
      isOpen: null,
      closingSoon: false,
      statusLabel: normalized,
      nextChange: null,
      weeklySchedule: [],
    }
  }
}
