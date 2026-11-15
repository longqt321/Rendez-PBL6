import { env } from "@/lib/env"

const ANON_ID_KEY = "rendez_anon_id"
const SESSION_ID_KEY = "rendez_session_id"

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

export function emitPlaceClick(placeId: string): void {
  try {
    const event = {
      eventType: "place_click",
      placeId,
      anonId: getAnonId(),
      sessionId: sessionId(),
    }
    const body = JSON.stringify({ events: [event] })
    const url = `${env.apiBaseUrl}/events`

    if (typeof navigator.sendBeacon === "function") {
      // Blob có content-type application/json để BE parse được body.
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
