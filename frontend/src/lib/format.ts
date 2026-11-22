const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
  ["second", 1],
]

const rtf = new Intl.RelativeTimeFormat("vi", { numeric: "auto" })
const numberFormat = new Intl.NumberFormat("vi")
const compactFormat = new Intl.NumberFormat("vi", {
  notation: "compact",
  maximumFractionDigits: 1,
})
const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const time = new Date(iso).getTime()
  // Ngày không hợp lệ → `NaN` → `rtf.format` ném RangeError làm trắng trang.
  if (Number.isNaN(time)) return ""

  const diffSeconds = (time - now) / 1000
  const abs = Math.abs(diffSeconds)

  for (const [unit, seconds] of UNITS) {
    if (abs >= seconds || unit === "second") {
      return rtf.format(Math.round(diffSeconds / seconds), unit)
    }
  }
  return "bây giờ"
}

export function formatCount(value: number): string {
  return value < 1000 ? String(value) : compactFormat.format(value)
}

export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

export function formatDate(iso: string): string {
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return ""
  return dateFormat.format(time)
}

const dateTimeFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

export function formatDateTime(iso: string): string {
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return ""
  return dateTimeFormat.format(time)
}

const ratingFormat = new Intl.NumberFormat("vi", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatRating(value: number): string {
  return ratingFormat.format(value)
}

export function formatCoordinate(value: number): string {
  return value.toFixed(4)
}

const kmFormat = new Intl.NumberFormat("vi", { maximumFractionDigits: 1 })

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`
  return `${kmFormat.format(distanceKm)} km`
}

/**
 * Chữ cái đầu của tên để hiện trong `AvatarFallback`: "Nguyễn Yến" → "NY".
 *
 * Dùng cho tên phát sinh lúc chạy (thành viên phòng lọc nhập tay); tên có sẵn
 * trong fixture đã kèm sẵn trường `initials` nên không đi qua hàm này.
 */
export function formatInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}
