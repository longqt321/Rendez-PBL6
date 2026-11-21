import { AsyncLocalStorage } from "node:async_hooks"

export interface RequestContextStore {
  requestId: string
  traceId: string
  userId?: string
  dbMs: number
  dbCount: number
  redisMs: number
  embedMs: number
  externalMs: number
  cacheHit?: boolean
}

const storage = new AsyncLocalStorage<RequestContextStore>()

const TRACEPARENT_RE = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/i
const ALL_ZERO_TRACE = /^0{32}$/

/** Trích `trace_id` (32 hex) từ W3C `traceparent`, bỏ qua giá trị không hợp lệ hoặc toàn 0. */
export function parseTraceparent(header: string | undefined): string | null {
  if (!header) return null
  const match = TRACEPARENT_RE.exec(header.trim())
  if (!match?.[1]) return null
  const traceId = match[1].toLowerCase()
  return ALL_ZERO_TRACE.test(traceId) ? null : traceId
}

export function generateTraceId(): string {
  return crypto.randomUUID().replaceAll("-", "")
}

export function runWithRequestContext<T>(store: RequestContextStore, fn: () => T): T {
  return storage.run(store, fn)
}

export function getRequestContext(): RequestContextStore | undefined {
  return storage.getStore()
}

export function setRequestUserId(userId: string): void {
  const store = storage.getStore()
  if (store) store.userId = userId
}

export function setRequestCacheHit(hit: boolean): void {
  const store = storage.getStore()
  if (store) store.cacheHit = hit
}

export function recordDbTiming(ms: number): void {
  const store = storage.getStore()
  if (!store) return
  store.dbCount += 1
  store.dbMs += ms
}

export function recordRedisTiming(ms: number): void {
  const store = storage.getStore()
  if (store) store.redisMs += ms
}

export function recordEmbedTiming(ms: number): void {
  const store = storage.getStore()
  if (store) store.embedMs += ms
}

export function recordExternalTiming(ms: number): void {
  const store = storage.getStore()
  if (store) store.externalMs += ms
}
