import { pubsub } from "./pubsub"

export interface NotificationEvent {
  version: number
}

type Listener = (event: NotificationEvent) => void

const channels = new Map<string, Set<Listener>>()
const versions = new Map<string, number>()
const unsubs = new Map<string, () => void>()

export function subscribeNotifications(userId: string, listener: Listener): () => void {
  const listeners = channels.get(userId) ?? new Set<Listener>()
  listeners.add(listener)
  channels.set(userId, listeners)

  // Nếu là subscriber đầu tiên cho user này trên instance hiện tại, đăng ký vào Postgres PubSub
  if (listeners.size === 1) {
    const channelName = `notify_${userId}`
    pubsub
      .subscribe(channelName, (payload) => {
        let version = notificationVersion(userId) + 1
        let sourcePid: number | undefined
        try {
          const parsed = JSON.parse(payload) as { version?: number; sourcePid?: number }
          if (typeof parsed.version === "number") version = parsed.version
          sourcePid = parsed.sourcePid
        } catch {
          // ignore
        }

        // Bỏ qua nếu tin nhắn xuất phát từ chính tiến trình này (vì đã được gọi trực tiếp)
        if (sourcePid === process.pid) return

        versions.set(userId, version)

        const activeListeners = channels.get(userId)
        if (!activeListeners) return
        for (const fn of activeListeners) {
          try {
            fn({ version })
          } catch {
            // bỏ qua kết nối đã ngắt
          }
        }
      })
      .then((unsub) => {
        unsubs.set(userId, unsub)
      })
  }

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      channels.delete(userId)
      versions.delete(userId)
      const unsub = unsubs.get(userId)
      if (unsub) {
        unsub()
        unsubs.delete(codeFallback(userId))
      }
    }
  }
}

function codeFallback(id: string): string {
  return id
}

export function notificationVersion(userId: string): number {
  return versions.get(userId) ?? 0
}

export function publishNotification(userId: string): void {
  const version = notificationVersion(userId) + 1
  versions.set(userId, version)

  // 1. Kích hoạt NGAY các listener trên TIẾN TRÌNH HIỆN TẠI (In-memory loopback tức thì)
  const listeners = channels.get(userId)
  if (listeners) {
    for (const listener of listeners) {
      try {
        listener({ version })
      } catch {
        // bỏ qua kết nối lỗi
      }
    }
  }

  // 2. Đồng thời phát qua Postgres LISTEN/NOTIFY cho các TIẾN TRÌNH KHÁC
  const channelName = `notify_${userId}`
  void pubsub.publish(channelName, JSON.stringify({ version, sourcePid: process.pid }))
}

export function notificationSubscriberCount(userId: string): number {
  return channels.get(userId)?.size ?? 0
}
