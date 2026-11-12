import { ApiError } from "./errors"

export interface Cursor {
  createdAt: Date
  id: string
}

/**
 * Cursor của `GET /places` — có **tag kiểu** (`kind`) để không trộn khoá giữa
 * các kiểu sắp xếp (`newest`/`rating`/`distance`, mục 3.2 của thiết kế):
 * - `newest`   → `newest|<created_at ISO>|<id>`
 * - `rating`   → `rating|<rating>|<review_count>|<created_at ISO>|<id>`
 * - `distance` → `distance|<km hoặc rỗng>|<id>` (rỗng = dòng cuối thiếu toạ độ)
 *
 * Cursor **cũ** (chỉ `created_at|id`, không tag) đọc thành `newest` — link và
 * phiên infinite-scroll đang mở không vỡ khi triển khai thay đổi này.
 *
 * Decode **sai** (base64 hỏng, thiếu phần, số không hữu hạn, id sai dạng) →
 * `null` để route trả 400 thay vì lặng lẽ trả trang đầu.
 *
 * NGOẠI LỆ có chủ đích: cursor decode ĐÚNG nhưng `kind` khác kiểu sắp xếp hiện
 * tại (người dùng đổi sort, hoặc link cũ mang cursor của sort khác) thì route
 * coi như **không có cursor** và trả trang đầu. Trả 400 ở đây sẽ làm vỡ trang
 * với một hành động hoàn toàn hợp lệ (đổi sort); trả trang đầu chỉ tốn một
 * request thừa. Nguyên tắc "không lặng lẽ" chỉ áp cho cursor decode SAI.
 */
export type PlaceCursor =
  | { kind: "newest"; createdAt: Date; id: string }
  | { kind: "rating"; rating: number; reviewCount: number; createdAt: Date; id: string }
  | { kind: "distance"; distance: number | null; id: string }

/** Kiểu sắp xếp hỗ trợ cho `GET /places` — trùng tên tag của `PlaceCursor`. */
export type PlaceSort = PlaceCursor["kind"]

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

/**
 * Kiểm `:id` dạng uuid trước khi đưa vào SQL (`::uuid`).
 *
 * Đặt ở đây (cạnh `UUID_ID_RE`) để route bài đăng và module OG dùng CÙNG một
 * cách kiểm — trước đây hàm này nằm riêng trong `routes/posts.ts`, copy sang
 * module khác là lệch hợp đồng lỗi (404 kèm message nào).
 */
export function requireUuid(value: string, message: string): string {
  if (!UUID_ID_RE.test(value)) throw new ApiError(404, message)
  return value
}

/** Số hữu hạn từ chuỗi cursor — `null` khi rỗng/không phải số. */
function parseFiniteNumber(raw: string): number | null {
  if (raw === "") return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

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

export function encodePlaceCursor(cursor: PlaceCursor): string {
  let payload: string
  switch (cursor.kind) {
    case "newest":
      payload = `newest|${cursor.createdAt.toISOString()}|${cursor.id}`
      break
    case "rating":
      payload = `rating|${cursor.rating}|${cursor.reviewCount}|${cursor.createdAt.toISOString()}|${cursor.id}`
      break
    case "distance":
      // Khoảng cách rỗng = dòng cuối trang thiếu toạ độ (NULL) — giữ nguyên
      // thông tin đó để trang sau biết phải lấy các dòng NULL có id lớn hơn.
      payload = `distance|${cursor.distance === null ? "" : cursor.distance}|${cursor.id}`
      break
  }
  return Buffer.from(payload, "utf8").toString("base64url")
}

export function decodePlaceCursor(raw: string, idPattern: RegExp = SLUG_ID_RE): PlaceCursor | null {
  let decoded: string
  try {
    decoded = Buffer.from(raw, "base64url").toString("utf8")
  } catch {
    return null
  }

  const parts = decoded.split("|")
  const tag = parts[0]

  if (tag === "newest") {
    if (parts.length !== 3) return null
    const createdAt = new Date(parts[1]!)
    const id = parts[2]!
    if (Number.isNaN(createdAt.getTime()) || !idPattern.test(id)) return null
    return { kind: "newest", createdAt, id }
  }

  if (tag === "rating") {
    if (parts.length !== 5) return null
    const rating = parseFiniteNumber(parts[1]!)
    const reviewCount = parseFiniteNumber(parts[2]!)
    const createdAt = new Date(parts[3]!)
    const id = parts[4]!
    if (rating === null || reviewCount === null) return null
    if (Number.isNaN(createdAt.getTime()) || !idPattern.test(id)) return null
    return { kind: "rating", rating, reviewCount, createdAt, id }
  }

  if (tag === "distance") {
    if (parts.length !== 3) return null
    const id = parts[2]!
    if (!idPattern.test(id)) return null
    const distance = parseFiniteNumber(parts[1]!)
    // Chuỗi không rỗng nhưng không phải số → cursor hỏng.
    if (parts[1] !== "" && distance === null) return null
    return { kind: "distance", distance, id }
  }

  // Cursor cũ `created_at|id` (không tag) → hiểu là `newest`.
  const separator = decoded.lastIndexOf("|")
  if (separator <= 0) return null

  const createdAt = new Date(decoded.slice(0, separator))
  const id = decoded.slice(separator + 1)
  if (Number.isNaN(createdAt.getTime()) || !idPattern.test(id)) return null

  return { kind: "newest", createdAt, id }
}
