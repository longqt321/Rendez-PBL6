/**
 * Suy ra trạng thái "đang mở cửa" từ chuỗi giờ mở cửa thô (chuẩn OSM) — bản
 * backend của `frontend/src/features/places/lib/opening-hours.ts` (cùng quy tắc
 * để server và client không kết luận khác nhau cho cùng một quán).
 *
 * Hàm thuần, không phụ thuộc thư viện ngoài — chỉ parse được tập con phổ biến
 * của spec `opening_hours` mà corpus thật chứa (xem `data/cold-start`):
 * - `24/7`
 * - `Mo-Su 08:00-22:00`
 * - `Mo-Fr 07:00-17:30; Sa-Su 08:00-20:00`
 * - nhiều khung giờ cách nhau bởi `;` hoặc `,`, giờ `HH:MM` hoặc `HH:MM:SS`
 * - khung không có ngày (`07:00-22:00`) = áp dụng mọi ngày
 * - khung qua nửa đêm (`22:00-02:00`) tính là mở sang hôm sau
 *
 * Không parse được (rỗng, lệch format, cú pháp lạ) → `null` = "không biết",
 * caller không được suy diễn thành mở/đóng.
 */

/** Chỉ số ngày JS (`getDay()`: 0 = Chủ nhật). */
const DAY_INDEX: Record<string, number> = {
  su: 0,
  mo: 1,
  tu: 2,
  we: 3,
  th: 4,
  fr: 5,
  sa: 6,
}

/** Khung giờ trong một ngày, tính bằng phút từ nửa đêm. */
interface TimeRange {
  startMinutes: number
  /** Nhỏ hơn `startMinutes` nghĩa là khung qua nửa đêm. */
  endMinutes: number
}

/** Ngày áp dụng của một khung: `null` = mọi ngày. */
type DaySet = number[] | null

interface OpeningRule {
  days: DaySet
  ranges: TimeRange[]
}

/** Đổi `HH:MM[:SS]` thành phút từ nửa đêm; sai thì `null`. */
function parseTime(raw: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/u.exec(raw)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 24 || minutes > 59) return null
  return hours * 60 + minutes
}

/** "Mo-Su" → [1..6,0]; "Fr" → [5]; sai thì `null`. */
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

/**
 * Parse một khung (đã tách bởi `;` hoặc `,`) thành rule.
 * Trả `null` khi khung không chứa giờ hợp lệ nào.
 */
function parseRule(part: string): OpeningRule | null {
  // Bắt ngày đứng trước giờ: "Mo-Su 08:00-22:00", "Mo,We-Fr 09:00-17:00".
  const dayMatch =
    /^((?:[A-Za-z]{2}(?:\s*-\s*[A-Za-z]{2})?)(?:\s*,\s*[A-Za-z]{2}(?:\s*-\s*[A-Za-z]{2})?)*)\s+(.*)$/u.exec(
      part.trim(),
    )

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

/**
 * Trạng thái mở cửa tại thời điểm `now` (mặc định hiện tại), so theo múi giờ
 * Việt Nam (Asia/Ho_Chi_Minh) bất kể múi giờ máy.
 *
 * - `true` / `false`: có giờ mở cửa và parse được.
 * - `null`: không có dữ liệu hoặc format không hiểu được.
 */
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
  const nowMinutes = hour * 60 + minute

  for (const rule of rules) {
    if (rule.days !== null && !rule.days.includes(weekdayIndex)) continue
    for (const { startMinutes, endMinutes } of rule.ranges) {
      if (startMinutes === endMinutes) continue // khung 00:00-00:00 vô nghĩa
      if (endMinutes > startMinutes) {
        if (nowMinutes >= startMinutes && nowMinutes < endMinutes) return true
      } else if (nowMinutes >= startMinutes || nowMinutes < endMinutes) {
        return true // qua nửa đêm: 22:00-02:00
      }
    }
  }
  return false
}
