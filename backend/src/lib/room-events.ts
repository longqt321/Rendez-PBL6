export interface RoomUpdateEvent {
  version: number
}

type Listener = (event: RoomUpdateEvent) => void

const channels = new Map<string, Set<Listener>>()
const versions = new Map<string, number>()

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

export function roomVersion(code: string): number {
  return versions.get(code) ?? 0
}

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

export function roomSubscriberCount(code: string): number {
  return channels.get(code)?.size ?? 0
}
