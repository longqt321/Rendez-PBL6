import { onCLS, onINP, onLCP, type Metric } from "web-vitals"
import { env } from "@/lib/env"

type ClientErrorSource = "react-boundary" | "window-error" | "unhandled-rejection" | "api-contract"

interface ClientErrorPayload {
  kind: "error"
  message: string
  stack?: string
  route?: string
  source?: ClientErrorSource
  apiRequestId?: string
  status?: number
}

interface WebVitalPayload {
  kind: "web-vital"
  name: "LCP" | "INP" | "CLS"
  value: number
  rating?: "good" | "needs-improvement" | "poor"
  route?: string
  navigationType?: string
}

type TelemetryItem = ClientErrorPayload | WebVitalPayload

const NOISE_PATTERNS = [
  /ResizeObserver loop/i,
  /chrome-extension:\/\//i,
  /moz-extension:\/\//i,
  /^Script error\.?$/i,
]

const buffer: TelemetryItem[] = []
let timer: ReturnType<typeof setTimeout> | null = null
let initialized = false

function currentRoute(): string {
  return typeof window !== "undefined" ? window.location.pathname : "/"
}

function isNoisyMessage(message: string, stack?: string): boolean {
  const combined = `${message}\n${stack ?? ""}`
  return NOISE_PATTERNS.some((pattern) => pattern.test(combined))
}

function flushTelemetry(): void {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
  if (buffer.length === 0 || env.enableMocks) {
    buffer.length = 0
    return
  }

  const items = buffer.splice(0, 15)
  const body = JSON.stringify({ items })
  const url = `${env.apiBaseUrl}/telemetry`

  try {
    if (typeof navigator.sendBeacon === "function") {
      if (navigator.sendBeacon(url, new Blob([body], { type: "application/json" }))) return
    }
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      credentials: "include",
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Telemetry không bao giờ làm hỏng UI.
  }
}

function enqueue(item: TelemetryItem): void {
  if (env.enableMocks) return
  buffer.push(item)
  if (buffer.length >= 10) {
    flushTelemetry()
    return
  }
  if (timer === null) {
    timer = setTimeout(flushTelemetry, 3_000)
  }
}

/** Sinh W3C `traceparent` (`00-<32hex>-<16hex>-01`) để nối request FE ↔ BE. */
export function createTraceparent(): string {
  const traceId = crypto.randomUUID().replaceAll("-", "")
  const spanId = crypto.randomUUID().replaceAll("-", "").slice(0, 16)
  return `00-${traceId}-${spanId}-01`
}

export function reportClientError(input: Omit<ClientErrorPayload, "kind">): void {
  if (!input.message || isNoisyMessage(input.message, input.stack)) return
  enqueue({
    kind: "error",
    ...input,
    message: input.message.slice(0, 400),
    stack: input.stack?.slice(0, 1500),
    route: input.route ?? currentRoute(),
  })
}

function recordWebVital(metric: Metric): void {
  if (metric.name !== "LCP" && metric.name !== "INP" && metric.name !== "CLS") return
  // Giữ 100% phiên chậm/cần cải thiện, lấy mẫu 20% phiên đạt chuẩn để giảm tải.
  if (metric.rating === "good" && Math.random() > 0.2) return

  enqueue({
    kind: "web-vital",
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    route: currentRoute(),
    navigationType: metric.navigationType,
  })
}

export function initClientTelemetry(): void {
  if (initialized || env.enableMocks || typeof window === "undefined") return
  initialized = true

  window.addEventListener("error", (event) => {
    const err = event.error instanceof Error ? event.error : null
    reportClientError({
      message: err?.message ?? event.message ?? "Unhandled window error",
      stack: err?.stack,
      source: "window-error",
    })
  })

  window.addEventListener("unhandledrejection", (event) => {
    const reason: unknown = event.reason
    if (reason instanceof DOMException && reason.name === "AbortError") return
    const err = reason instanceof Error ? reason : null
    reportClientError({
      message:
        err?.message ?? (typeof reason === "string" ? reason : "Unhandled promise rejection"),
      stack: err?.stack,
      source: "unhandled-rejection",
    })
  })

  window.addEventListener("pagehide", flushTelemetry)
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushTelemetry()
    })
  }
  onLCP(recordWebVital)
  onINP(recordWebVital)
  onCLS(recordWebVital)
}
