import { format, formatDistance as formatDateDistance, isValid, parseISO } from "date-fns"
import { vi } from "date-fns/locale"

const numberFormat = new Intl.NumberFormat("vi")
const compactFormat = new Intl.NumberFormat("vi", {
  notation: "compact",
  maximumFractionDigits: 1,
})

function parseDateSafe(iso: string): Date | null {
  const parsed = parseISO(iso)
  if (isValid(parsed)) return parsed
  const fallback = new Date(iso)
  return isValid(fallback) ? fallback : null
}

export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const date = parseDateSafe(iso)
  if (!date) return ""
  return formatDateDistance(date, new Date(now), { addSuffix: true, locale: vi })
}

export function formatCount(value: number): string {
  return value < 1000 ? String(value) : compactFormat.format(value)
}

export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

export function formatDate(iso: string): string {
  const date = parseDateSafe(iso)
  if (!date) return ""
  return format(date, "dd/MM/yyyy", { locale: vi })
}

export function formatDateTime(iso: string): string {
  const date = parseDateSafe(iso)
  if (!date) return ""
  return format(date, "dd/MM/yyyy HH:mm", { locale: vi })
}

export function formatWeekdayDate(isoDate: string): string {
  const date = parseDateSafe(isoDate)
  if (!date) return ""
  return format(date, "EEEE, dd/MM", { locale: vi })
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
