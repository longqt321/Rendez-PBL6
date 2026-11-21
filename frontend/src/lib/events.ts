import { env } from "@/lib/env"

const ANON_ID_KEY = "rendez_anon_id"
const SESSION_ID_KEY = "rendez_session_id"
const FLUSH_INTERVAL_MS = 5_000
const MAX_BATCH_SIZE = 20

export interface TrackEventInput {
  eventType: string
  placeId?: string
  postId?: string
  query?: string
  context?: Record<string, unknown>
}

interface QueuedEvent extends TrackEventInput {
  eventId: string
  anonId?: string
  sessionId?: string
}

const queue: QueuedEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let lifecycleBound = false

function getStorage(name: "localStorage" | "sessionStorage"): Storage | null {
  try {
    return globalThis[name]
  } catch {
    return null
  }
}

function readOrCreateId(storage: Storage | null, key: string): string | undefined {
  if (storage === null) return undefined
  try {
    const existing = storage.getItem(key)
    if (existing) return existing
    const id = crypto.randomUUID()
    storage.setItem(key, id)
    return id
  } catch {
    return undefined
  }
}

export function getAnonId(): string | undefined {
  return readOrCreateId(getStorage("localStorage"), ANON_ID_KEY)
}

function sessionId(): string | undefined {
  return readOrCreateId(getStorage("sessionStorage"), SESSION_ID_KEY)
}

function sendBatch(events: QueuedEvent[]): void {
  if (events.length === 0 || env.enableMocks) return
  try {
    const body = JSON.stringify({ events })
    const url = `${env.apiBaseUrl}/events`

    if (typeof navigator.sendBeacon === "function") {
      if (navigator.sendBeacon(url, new Blob([body], { type: "application/json" }))) {
        return
      }
    }
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      credentials: "include",
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Telemetry không bao giờ làm hỏng tương tác người dùng.
  }
}

export function flushEvents(): void {
  if (flushTimer !== null) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  while (queue.length > 0) {
    sendBatch(queue.splice(0, MAX_BATCH_SIZE))
  }
}

function ensureLifecycleFlush(): void {
  if (lifecycleBound || typeof window === "undefined") return
  lifecycleBound = true
  window.addEventListener("pagehide", flushEvents)
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushEvents()
    })
  }
}

export function trackEvent(input: TrackEventInput): void {
  if (env.enableMocks) return
  try {
    ensureLifecycleFlush()
    queue.push({
      ...input,
      eventId: crypto.randomUUID(),
      anonId: getAnonId(),
      sessionId: sessionId(),
    })

    if (queue.length >= MAX_BATCH_SIZE) {
      flushEvents()
      return
    }
    if (flushTimer === null) {
      flushTimer = setTimeout(flushEvents, FLUSH_INTERVAL_MS)
    }
  } catch {
    // Telemetry không bao giờ làm hỏng tương tác người dùng.
  }
}

export function emitPlaceClick(placeId: string): void {
  trackEvent({ eventType: "place_click", placeId })
}
