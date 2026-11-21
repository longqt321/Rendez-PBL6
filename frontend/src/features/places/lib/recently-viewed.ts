const STORAGE_KEY = "rendez:recently-viewed"

export const RECENTLY_VIEWED_LIMIT = 8

/**
 * Phạm vi lịch sử xem: mỗi tài khoản một danh sách riêng, khách chưa đăng nhập
 * dùng phạm vi `guest`. Trước đây cả trình duyệt dùng chung một key nên đổi tài
 * khoản vẫn thấy lịch sử của người trước.
 */
export const GUEST_SCOPE = "guest"

function storageKey(scope: string): string {
  return `${STORAGE_KEY}:${scope}`
}

function readIds(scope: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(scope))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === "string")
  } catch {
    // Storage bị chặn / JSON hỏng: coi như chưa xem gì, không làm hỏng trang.
    return []
  }
}

function writeIds(scope: string, ids: string[]): void {
  try {
    localStorage.setItem(storageKey(scope), JSON.stringify(ids))
  } catch {
    // Hết quota / storage bị chặn — bỏ qua, tính năng chỉ mất phần lịch sử.
  }
}

export function getRecentlyViewedIds(scope: string = GUEST_SCOPE): string[] {
  return readIds(scope)
}

export function recordPlaceView(placeId: string, scope: string = GUEST_SCOPE): string[] {
  const next = [placeId, ...readIds(scope).filter((id) => id !== placeId)].slice(
    0,
    RECENTLY_VIEWED_LIMIT,
  )
  writeIds(scope, next)
  return next
}
