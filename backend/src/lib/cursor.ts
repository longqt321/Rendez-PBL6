/**
 * Cursor opaque cho phân trang keyset (D2).
 *
 * Nội dung thật là `created_at|id` của item cuối trang, encode base64url để
 * client không phụ thuộc hình dạng (đổi sang keyset khác không phá FE).
 * Decode sai → `null` để route trả 400 thay vì lặng lẽ trả trang đầu.
 */
export interface Cursor {
  createdAt: Date
  id: string
}

/**
 * Id dạng slug: place dùng slug (`mirkocoffeechillbeer-493`), post/user dùng
 * uuid — nên chỉ kiểm "không rỗng, không khoảng trắng, độ dài hợp lý" thay vì
 * ép uuid (ép uuid sẽ làm cursor của places không decode được).
 *
 * Export để route kiểm `:id` của place dùng CÙNG một regex — trước đây
 * `routes/places.ts` khai lại y hệt, sửa một nơi quên nơi kia là lệch hợp đồng.
 */
export const SLUG_ID_RE = /^[A-Za-z0-9_-]{1,120}$/

/**
 * Id dạng uuid — bắt buộc cho cursor của tài nguyên lưu khoá chính uuid
 * (post, user, thông báo). Không kiểm thì `::uuid` trong SQL ném lỗi cast → 500
 * khi client sửa cursor.
 */
export const UUID_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(`${cursor.createdAt.toISOString()}|${cursor.id}`, "utf8").toString("base64url")
}

export function decodeCursor(raw: string, idPattern: RegExp = SLUG_ID_RE): Cursor | null {
  let decoded: string
  try {
    decoded = Buffer.from(raw, "base64url").toString("utf8")
  } catch {
    return null
  }

  const separator = decoded.lastIndexOf("|")
  if (separator <= 0) return null

  const createdAt = new Date(decoded.slice(0, separator))
  const id = decoded.slice(separator + 1)
  if (Number.isNaN(createdAt.getTime()) || !idPattern.test(id)) return null

  return { createdAt, id }
}
