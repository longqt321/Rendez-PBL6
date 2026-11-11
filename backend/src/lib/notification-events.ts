/**
 * Kênh SSE cho thông báo (G6.3) — mỗi user một tập subscriber trong RAM.
 *
 * Mọi nơi ghi thông báo gọi `publishNotification(userId)` sau khi ghi DB để
 * phát sự kiện TRUNG TÍNH `{ version }` — không chứa nội dung thông báo.
 * Client nhận event rồi tự `GET /notifications` để lấy DTO theo phiên của
 * chính nó (cùng mô hình với kênh phòng `room-events.ts`).
 *
 * Giới hạn đã biết: chỉ đúng khi API chạy MỘT tiến trình; scale nhiều instance
 * phải thay bằng LISTEN/NOTIFY của Postgres hoặc Redis — đã ghi BACKLOG.
 */

export interface NotificationEvent {
  /** Số phiên bản tăng dần — client có thể bỏ qua event trùng. */
  version: number
}

type Listener = (event: NotificationEvent) => void

const channels = new Map<string, Set<Listener>>()
const versions = new Map<string, number>()

/** Đăng ký nhận cập nhật cho một user; trả hàm huỷ đăng ký. */
export function subscribeNotifications(userId: string, listener: Listener): () => void {
  const listeners = channels.get(userId) ?? new Set<Listener>()
  listeners.add(listener)
  channels.set(userId, listeners)

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      channels.delete(userId)
      versions.delete(userId)
    }
  }
}

/** Phiên bản hiện tại của kênh user (0 = chưa có thông báo nào trong tiến trình). */
export function notificationVersion(userId: string): number {
  return versions.get(userId) ?? 0
}

/** Phát sự kiện "user vừa có thông báo mới" cho mọi subscriber của user đó. */
export function publishNotification(userId: string): void {
  const version = notificationVersion(userId) + 1
  versions.set(userId, version)

  const listeners = channels.get(userId)
  if (!listeners) return
  for (const listener of listeners) {
    try {
      listener({ version })
    } catch {
      // Một kết nối đã đóng không được làm gãy các kết nối còn lại.
    }
  }
}

/** Số subscriber hiện tại của một user — dùng cho test. */
export function notificationSubscriberCount(userId: string): number {
  return channels.get(userId)?.size ?? 0
}
