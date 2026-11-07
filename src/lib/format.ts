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

export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const diffSeconds = (new Date(iso).getTime() - now) / 1000
  const abs = Math.abs(diffSeconds)

  for (const [unit, seconds] of UNITS) {
    if (abs >= seconds || unit === "second") {
      return rtf.format(Math.round(diffSeconds / seconds), unit)
    }
  }
  return "vừa xong"
}

export function formatCount(value: number): string {
  if (value < 1000) return String(value)
  return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`
}

export function formatNumber(value: number): string {
  return numberFormat.format(value)
}
