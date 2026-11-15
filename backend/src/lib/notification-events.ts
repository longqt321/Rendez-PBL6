export interface NotificationEvent {
  version: number
}

type Listener = (event: NotificationEvent) => void

const channels = new Map<string, Set<Listener>>()
const versions = new Map<string, number>()

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

export function notificationVersion(userId: string): number {
  return versions.get(userId) ?? 0
}

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

export function notificationSubscriberCount(userId: string): number {
  return channels.get(userId)?.size ?? 0
}
