const STORAGE_KEY = "rendez:recently-viewed"

export const RECENTLY_VIEWED_LIMIT = 8

function readIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === "string")
  } catch {
    // Storage bị chặn / JSON hỏng: coi như chưa xem gì, không làm hỏng trang.
    return []
  }
}

function writeIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // Hết quota / storage bị chặn — bỏ qua, tính năng chỉ mất phần lịch sử.
  }
}

export function getRecentlyViewedIds(): string[] {
  return readIds()
}

export function recordPlaceView(placeId: string): string[] {
  const next = [placeId, ...readIds().filter((id) => id !== placeId)].slice(
    0,
    RECENTLY_VIEWED_LIMIT,
  )
  writeIds(next)
  return next
}
