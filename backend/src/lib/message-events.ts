import type { DirectMessage } from "@rendez/schema"
import { logger } from "./logger"
import { pubsub } from "./pubsub"

type Listener = (message: DirectMessage) => void

const channels = new Map<string, Set<Listener>>()
const unsubs = new Map<string, () => void>()

export function subscribeDirectMessages(userId: string, listener: Listener): () => void {
  const listeners = channels.get(userId) ?? new Set<Listener>()
  listeners.add(listener)
  channels.set(userId, listeners)

  if (listeners.size === 1) {
    const channelName = `dm_${userId}`
    pubsub
      .subscribe(channelName, (payload) => {
        try {
          const parsed = JSON.parse(payload) as { message?: DirectMessage; sourcePid?: number }
          if (parsed.sourcePid === process.pid || !parsed.message) return

          const activeListeners = channels.get(userId)
          if (!activeListeners) return
          for (const fn of activeListeners) {
            try {
              fn(parsed.message)
            } catch {
              // Ignore error
            }
          }
        } catch {
          // Ignore error
        }
      })
      .then((unsub) => {
        unsubs.set(userId, unsub)
      })
      .catch((err) => {
        logger.error({ err, userId }, "Không đăng ký được Postgres PubSub cho tin nhắn trực tiếp")
      })
  }

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      channels.delete(userId)
      const unsub = unsubs.get(userId)
      if (unsub) {
        unsub()
        unsubs.delete(userId)
      }
    }
  }
}

export function publishDirectMessage(userId: string, message: DirectMessage): void {
  const listeners = channels.get(userId)
  if (listeners) {
    for (const listener of listeners) {
      try {
        listener(message)
      } catch {
        // Ignore error
      }
    }
  }

  const channelName = `dm_${userId}`
  void pubsub
    .publish(channelName, JSON.stringify({ message, sourcePid: process.pid }))
    .catch((err) => logger.error({ err, userId }, "pubsub dm publish error"))
}
