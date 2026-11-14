/**
 * Lịch sử "Bạn vừa xem" — lưu id địa điểm đã mở, phía client.
 *
 * Vì sao localStorage chứ không phải API: danh sách này chỉ phục vụ trải nghiệm
 * trên chính thiết bị (không cần đồng bộ, không cần server biết thứ tự xem).
 * Server đã có `interaction_events` cho mục đích cá nhân hoá; đây là bản tóm
 * tắt cục bộ, không phải nguồn sự thật thứ hai cho dữ liệu địa điểm.
 */

const STORAGE_KEY = "rendez:recently-viewed"
/** Giữ tối đa 8 địa điểm gần nhất — đủ cho một dải trên /discover. */
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

/** Danh sách id, mới nhất trước. */
export function getRecentlyViewedIds(): string[] {
  return readIds()
}

/**
 * Ghi nhận một lượt xem: đưa id lên đầu, bỏ trùng, cắt còn `RECENTLY_VIEWED_LIMIT`.
 * Trả về danh sách sau khi ghi để caller dùng ngay mà không đọc lại storage.
 */
export function recordPlaceView(placeId: string): string[] {
  const next = [placeId, ...readIds().filter((id) => id !== placeId)].slice(
    0,
    RECENTLY_VIEWED_LIMIT,
  )
  writeIds(next)
  return next
}
