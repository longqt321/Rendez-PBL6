import type { Room } from "@rendez/schema"

/**
 * Kênh SSE cho phòng lọc nhóm (T6.3).
 *
 * Mỗi phòng có một tập subscriber trong RAM của tiến trình. Mọi mutation đều
 * gọi `publishRoom` để đẩy trạng thái mới cho các tab/thiết bị đang mở phòng —
 * thay cho BroadcastChannel (chỉ hoạt động cùng trình duyệt).
 *
 * Giới hạn đã biết: chỉ đúng khi API chạy MỘT tiến trình. Khi scale nhiều
 * instance phải thay bằng LISTEN/NOTIFY của Postgres hoặc Redis — ghi BACKLOG.
 */

type Listener = (room: Room) => void

const channels = new Map<string, Set<Listener>>()

/** Đăng ký nhận cập nhật; trả hàm huỷ đăng ký. */
export function subscribeRoom(code: string, listener: Listener): () => void {
  const listeners = channels.get(code) ?? new Set<Listener>()
  listeners.add(listener)
  channels.set(code, listeners)

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) channels.delete(code)
  }
}

/** Đẩy trạng thái phòng mới cho mọi subscriber của mã phòng đó. */
export function publishRoom(code: string, room: Room): void {
  const listeners = channels.get(code)
  if (!listeners) return
  for (const listener of listeners) {
    try {
      listener(room)
    } catch {
      // Một kết nối đã đóng không được làm gãy các kết nối còn lại.
    }
  }
}

/** Số subscriber hiện tại — dùng cho test và `/readyz`. */
export function roomSubscriberCount(code: string): number {
  return channels.get(code)?.size ?? 0
}
