import { pubsub } from "./pubsub"

export interface RoomUpdateEvent {
  version: number
}

type Listener = (event: RoomUpdateEvent) => void

const channels = new Map<string, Set<Listener>>()
const versions = new Map<string, number>()
const unsubs = new Map<string, () => void>()

export function subscribeRoom(code: string, listener: Listener): () => void {
  const listeners = channels.get(code) ?? new Set<Listener>()
  listeners.add(listener)
  channels.set(code, listeners)

  // Đăng ký vào Postgres PubSub nếu chạy đa tiến trình
  if (listeners.size === 1) {
    const channelName = `room_${code}`
    pubsub
      .subscribe(channelName, (payload) => {
        let version = roomVersion(code) + 1
        try {
          const parsed = JSON.parse(payload) as { version?: number }
          if (typeof parsed.version === "number") version = parsed.version
        } catch {
          // ignore
        }
        versions.set(code, version)

        const activeListeners = channels.get(code)
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
        unsubs.set(code, unsub)
      })
  }

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      channels.delete(code)
      versions.delete(code)
      const unsub = unsubs.get(code)
      if (unsub) {
        unsub()
        unsubs.delete(code)
      }
    }
  }
}

export function roomVersion(code: string): number {
  return versions.get(code) ?? 0
}

export function publishRoom(code: string): void {
  const version = roomVersion(code) + 1
  versions.set(code, version)

  // 1. Kích hoạt NGAY các listener trên TIẾN TRÌNH HIỆN TẠI (In-memory loopback)
  const listeners = channels.get(code)
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
  const channelName = `room_${code}`
  void pubsub.publish(channelName, JSON.stringify({ version, sourcePid: process.pid }))
}

export function roomSubscriberCount(code: string): number {
  return channels.get(code)?.size ?? 0
}
