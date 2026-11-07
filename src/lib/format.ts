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

/**
 * "18 giờ trước", "Hôm qua", "tuần trước"…
 *
 * `Intl.RelativeTimeFormat` lo phần chữ; vòng lặp chỉ chọn đơn vị lớn nhất
 * còn vừa (API của `Intl` không tự chọn đơn vị).
 */
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

/**
 * Số đếm rút gọn theo chuẩn tiếng Việt: `999`, `1 N`, `1,5 N`, `2 Tr`.
 *
 * Dùng `Intl.NumberFormat` compact notation thay vì tự cắt `K` — cách cũ in
 * `2.0K` (sai dấu thập phân) và không bao giờ lên `M`.
 */
export function formatCount(value: number): string {
  return value < 1000 ? String(value) : compactFormat.format(value)
}

/** Số đầy đủ có phân cách nghìn: `1.234`. */
export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

/** Ngày tuyệt đối kiểu Việt Nam: `07/11/2026`. */
export function formatDate(iso: string): string {
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return ""
  return dateFormat.format(time)
}

const ratingFormat = new Intl.NumberFormat("vi", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** Điểm đánh giá 1 chữ số thập phân kiểu Việt Nam: `4,5`. */
export function formatRating(value: number): string {
  return ratingFormat.format(value)
}

/**
 * Toạ độ địa lý, 4 chữ số thập phân, dấu chấm cố định.
 *
 * Cố ý KHÔNG dùng `Intl`: toạ độ phải copy/paste được sang công cụ bản đồ,
 * nơi dấu phẩy thập phân kiểu Việt Nam sẽ bị hiểu sai.
 */
export function formatCoordinate(value: number): string {
  return value.toFixed(4)
}

const kmFormat = new Intl.NumberFormat("vi", { maximumFractionDigits: 1 })

/**
 * Khoảng cách thân thiện: dưới 1 km hiện theo mét (`350 m`), từ 1 km hiện
 * `1,2 km` (dấu phẩy thập phân theo tiếng Việt).
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`
  return `${kmFormat.format(distanceKm)} km`
}
