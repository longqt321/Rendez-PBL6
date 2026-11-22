import { logger } from "./logger"
import { getRedis } from "./redis"

export type ObservabilityEventKind = "slow_request" | "server_error" | "client_error" | "web_vital"

export interface ObservabilityTiming {
  dbMs: number
  dbCount: number
  redisMs: number
  embedMs: number
  externalMs: number
  appMs: number
}

export interface ObservabilityEvent {
  id: string
  kind: ObservabilityEventKind
  timestamp: string
  requestId?: string
  traceId?: string
  method?: string
  route?: string
  status?: number
  durationMs?: number
  timing?: ObservabilityTiming
  message?: string
  metric?: "LCP" | "INP" | "CLS" | "FCP" | "TTFB"
  value?: number
  rating?: "good" | "needs-improvement" | "poor"
  source?: string
}

const REDIS_KEY = "obs:events"
const MAX_EVENTS = 500
const memoryRing: ObservabilityEvent[] = []

/**
 * Đẩy 1 sự kiện quan sát (request chậm, 5xx, client error, web vital) vào ring buffer
 * dùng chung cho UI Admin (`LPUSH` + `LTRIM` trên Redis, fallback in-memory).
 */
export function pushObservabilityEvent(input: Omit<ObservabilityEvent, "id" | "timestamp">): void {
  const event: ObservabilityEvent = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...input,
  }

  memoryRing.unshift(event)
  if (memoryRing.length > MAX_EVENTS) memoryRing.length = MAX_EVENTS

  const redis = getRedis()
  if (redis) {
    void redis
      .lpush(REDIS_KEY, JSON.stringify(event))
      .then(() => redis.ltrim(REDIS_KEY, 0, MAX_EVENTS - 1))
      .catch((err: unknown) => {
        logger.debug({ err }, "Không ghi được observability event lên Redis")
      })
  }
}

export async function listObservabilityEvents(limit = 200): Promise<ObservabilityEvent[]> {
  const safeLimit = Math.min(MAX_EVENTS, Math.max(1, limit))
  const redis = getRedis()
  if (redis) {
    try {
      const rawItems = await redis.lrange(REDIS_KEY, 0, safeLimit - 1)
      if (rawItems.length > 0) {
        const parsed: ObservabilityEvent[] = []
        for (const raw of rawItems) {
          try {
            parsed.push(JSON.parse(raw) as ObservabilityEvent)
          } catch {
            // Bỏ qua record hỏng
          }
        }
        return parsed
      }
    } catch (err) {
      logger.debug({ err }, "Không đọc được observability events từ Redis — fallback bộ nhớ")
    }
  }
  return memoryRing.slice(0, safeLimit)
}
