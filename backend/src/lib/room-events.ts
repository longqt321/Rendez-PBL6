/**
 * Kênh SSE cho phòng lọc nhóm (T6.3).
 *
 * Mỗi phòng có một tập subscriber trong RAM của tiến trình. Mọi mutation đều
 * gọi `publishRoom(code)` để phát một sự kiện TRUNG TÍNH `{ version }` — không
 * chứa `isMe`, `memberId` hay token của người gây mutation. Client nhận event
 * rồi tự `GET /rooms/:code` để lấy DTO đúng theo danh tính của chính nó.
 *
 * Giới hạn đã biết: chỉ đúng khi API chạy MỘT tiến trình. Khi scale nhiều
 * instance phải thay bằng LISTEN/NOTIFY của Postgres hoặc Redis — ghi BACKLOG.
 */

export interface RoomUpdateEvent {
  /** Số phiên bản tăng dần của phòng — client có thể bỏ qua event trùng. */
  version: number
}

type Listener = (event: RoomUpdateEvent) => void

const channels = new Map<string, Set<Listener>>()
const versions = new Map<string, number>()

/** Đăng ký nhận cập nhật; trả hàm huỷ đăng ký. */
export function subscribeRoom(code: string, listener: Listener): () => void {
  const listeners = channels.get(code) ?? new Set<Listener>()
  listeners.add(listener)
  channels.set(code, listeners)

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      channels.delete(code)
      versions.delete(code)
    }
  }
}

/** Phiên bản hiện tại của phòng (0 = chưa có mutation nào trong tiến trình). */
export function roomVersion(code: string): number {
  return versions.get(code) ?? 0
}

/** Phát sự kiện "phòng vừa đổi" cho mọi subscriber của mã phòng đó. */
export function publishRoom(code: string): void {
  const version = roomVersion(code) + 1
  versions.set(code, version)

  const listeners = channels.get(code)
  if (!listeners) return
  for (const listener of listeners) {
    try {
      listener({ version })
    } catch {
      // Một kết nối đã đóng không được làm gãy các kết nối còn lại.
    }
  }
}

/** Số subscriber hiện tại — dùng cho test và `/readyz`. */
export function roomSubscriberCount(code: string): number {
  return channels.get(code)?.size ?? 0
}
