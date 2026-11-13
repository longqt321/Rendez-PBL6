/**
 * Fire-and-forget telemetry: gửi sự kiện tương tác lên `POST /events` (P0).
 *
 * Nguyên tắc: telemetry KHÔNG BAO GIỜ chặn UI hay throw — mọi lỗi (storage
 * bị chặn, mạng lỗi, sendBeacon không hỗ trợ) đều nuốt im lặng. Không dùng
 * axios ở đây để tránh interceptor/toast của request nghiệp vụ.
 *
 * `anonId` lưu localStorage (key `rendez_anon_id`) — guest id opaque, BE dùng
 * khi chưa đăng nhập. `sessionId` lưu sessionStorage (key `rendez_session_id`)
 * — phân tách các phiên xem trong cùng trình duyệt.
 */

import { env } from "@/lib/env"

const ANON_ID_KEY = "rendez_anon_id"
const SESSION_ID_KEY = "rendez_session_id"

/** Truy cập storage có thể throw (chế độ riêng tư) → trả null thay vì crash. */
function getStorage(name: "localStorage" | "sessionStorage"): Storage | null {
  try {
    return globalThis[name]
  } catch {
    return null
  }
}

/** Đọc id từ storage, tạo UUID mới nếu chưa có; storage bị chặn → undefined. */
function readOrCreateId(storage: Storage | null, key: string): string | undefined {
  if (storage === null) return undefined
  try {
    const existing = storage.getItem(key)
    if (existing) return existing
    const id = crypto.randomUUID()
    storage.setItem(key, id)
    return id
  } catch {
    return undefined
  }
}

/**
 * Id ẩn danh của guest (localStorage, tạo UUID lần đầu). Dùng chung cho
 * `emitPlaceClick` và header `x-anon-id` của axios — MỘT nguồn duy nhất để
 * event FE và event BE gắn cùng một actor.
 */
export function getAnonId(): string | undefined {
  return readOrCreateId(getStorage("localStorage"), ANON_ID_KEY)
}

function sessionId(): string | undefined {
  return readOrCreateId(getStorage("sessionStorage"), SESSION_ID_KEY)
}

/**
 * Gửi 1 event `place_click` khi người dùng bấm vào card địa điểm.
 * Ưu tiên `navigator.sendBeacon` (không block unload), fallback
 * `fetch(..., { keepalive: true })`. Không có await — caller không đợi.
 */
export function emitPlaceClick(placeId: string): void {
  try {
    const event = {
      eventType: "place_click",
      placeId,
      anonId: getAnonId(),
      sessionId: sessionId(),
    }
    const body = JSON.stringify({ events: [event] })
    const url = `${env.apiBaseUrl}/events`

    if (typeof navigator.sendBeacon === "function") {
      // Blob có content-type application/json để BE parse được body.
      if (navigator.sendBeacon(url, new Blob([body], { type: "application/json" }))) {
        return
      }
    }
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      credentials: "include",
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Telemetry không bao giờ làm hỏng tương tác người dùng.
  }
}
