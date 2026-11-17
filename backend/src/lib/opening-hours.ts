const DAY_INDEX: Record<string, number> = {
  su: 0,
  mo: 1,
  tu: 2,
  we: 3,
  th: 4,
  fr: 5,
  sa: 6,
}

interface TimeRange {
  startMinutes: number

  endMinutes: number
}

type DaySet = number[] | null

interface OpeningRule {
  days: DaySet
  ranges: TimeRange[]
}

function parseTime(raw: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/u.exec(raw)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 24 || minutes > 59) return null
  return hours * 60 + minutes
}

function parseDayToken(raw: string): number[] | null {
  const [from, to] = raw.toLowerCase().split("-")
  const fromIndex = from ? DAY_INDEX[from] : undefined
  if (fromIndex === undefined) return null
  if (to === undefined) return [fromIndex]
  const toIndex = DAY_INDEX[to ?? ""]
  if (toIndex === undefined) return null
  const days: number[] = []
  let day = fromIndex
  for (;;) {
    days.push(day)
    if (day === toIndex) break
    day = (day + 1) % 7
  }
  return days
}

function parseRule(part: string): OpeningRule | null {
  // Bắt ngày đứng trước giờ: "Mo-Su 08:00-22:00", "Mo,We-Fr 09:00-17:00".
  const dayMatch = /^([a-zA-Z][a-zA-Z\s,-]*)\s+(\d.*)$/u.exec(part.trim())

  let days: DaySet = null
  let rest = part.trim()
  if (dayMatch) {
    const tokens = (dayMatch[1] ?? "").split(",").map((token) => token.replace(/\s+/gu, ""))
    const parsed: number[] = []
    for (const token of tokens) {
      const tokenDays = parseDayToken(token)
      if (!tokenDays) return null
      parsed.push(...tokenDays)
    }
    days = parsed
    rest = dayMatch[2] ?? ""
  }

  // Lấy mọi cặp giờ "HH:MM-HH:MM[:SS]" trong phần còn lại.
  const ranges: TimeRange[] = []
  const rangePattern = /(\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(\d{1,2}:\d{2}(?::\d{2})?)/gu
  for (const match of rest.matchAll(rangePattern)) {
    const start = parseTime(match[1] ?? "")
    const end = parseTime(match[2] ?? "")
    if (start === null || end === null) continue
    ranges.push({ startMinutes: start, endMinutes: end })
  }
  if (ranges.length === 0) return null

  return { days, ranges }
}

function getCurrentTimeInVN(now: Date): { weekdayIndex: number; nowMinutes: number } | null {
  // Giờ/phút/thứ tại Việt Nam — dùng Intl để không lệch múi giờ máy.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now)
  const valueOf = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? ""
  const weekdayIndex = DAY_INDEX[valueOf("weekday").slice(0, 2).toLowerCase()]
  const hour = Number(valueOf("hour")) % 24 // "24" lúc nửa đêm với hour12: false
  const minute = Number(valueOf("minute"))
  if (weekdayIndex === undefined || Number.isNaN(hour) || Number.isNaN(minute)) return null
  return { weekdayIndex, nowMinutes: hour * 60 + minute }
}

function isTimeInRange(nowMinutes: number, { startMinutes, endMinutes }: TimeRange): boolean {
  if (startMinutes === endMinutes) return false
  if (endMinutes > startMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes // qua nửa đêm: 22:00-02:00
}

function matchesAnyRule(rules: OpeningRule[], weekdayIndex: number, nowMinutes: number): boolean {
  for (const rule of rules) {
    if (rule.days !== null && !rule.days.includes(weekdayIndex)) continue
    for (const range of rule.ranges) {
      if (isTimeInRange(nowMinutes, range)) return true
    }
  }
  return false
}

export function isOpenNow(openingHours: string | null, now: Date = new Date()): boolean | null {
  if (!openingHours) return null
  const normalized = openingHours.trim()
  if (!normalized) return null
  if (normalized === "24/7") return true

  const rules: OpeningRule[] = []
  for (const part of normalized.split(/[;,]/)) {
    if (!part.trim()) continue
    const rule = parseRule(part)
    if (rule) rules.push(rule)
  }
  if (rules.length === 0) return null

  const currentTime = getCurrentTimeInVN(now)
  if (!currentTime) return null

  return matchesAnyRule(rules, currentTime.weekdayIndex, currentTime.nowMinutes)
}
