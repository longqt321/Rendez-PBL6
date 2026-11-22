import { monitorEventLoopDelay } from "node:perf_hooks"
import type { CircuitBreakerPolicy } from "cockatiel"
import { CircuitState } from "cockatiel"
import * as hdr from "hdr-histogram-js"

export type BreakerStatus = "closed" | "half-open" | "open"

export interface CircuitBreakerSnapshot {
  name: string
  state: BreakerStatus
  openCount: number
}

export interface MetricsSnapshot {
  uptimeMs: number
  totalQueries: number
  avgLatencyMs: number
  p50LatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number
  cacheHitRatio: number
  errors4xx: number
  errors5xx: number
  errorRate4xx: number
  errorRate5xx: number
  eventLoopLagMs: number
  security: {
    unauthorized401: number
    forbidden403: number
    rateLimited429: number
    authFailed: number
  }
  circuitBreakers: CircuitBreakerSnapshot[]
  byEndpoint: {
    route: string
    count: number
    avgMs: number
    p95Ms: number
    p99Ms: number
    cacheHits: number
    errorCount5xx: number
    errorRate5xx: number
  }[]
}

const startedAt = Date.now()

const MAX_ROUTES = 200
const MAX_TRACKABLE_MS = 3_600_000 // 1 giờ

function createHistogram() {
  return hdr.build({
    lowestDiscernibleValue: 1,
    highestTrackableValue: MAX_TRACKABLE_MS,
    numberOfSignificantValueDigits: 3,
  })
}

type RouteHistogram = ReturnType<typeof createHistogram>

interface EndpointStat {
  count: number
  totalMs: number
  cacheHits: number
  errors4xx: number
  errors5xx: number
  histogram: RouteHistogram
}

const endpoints = new Map<string, EndpointStat>()
let globalHistogram = createHistogram()
let unauthorized401 = 0
let forbidden403 = 0
let rateLimited429 = 0
let authFailed = 0

interface BreakerTracker {
  policy: CircuitBreakerPolicy
  openCount: number
}

const circuitBreakers = new Map<string, BreakerTracker>()

function mapCircuitState(state: CircuitState): BreakerStatus {
  if (state === CircuitState.Open || state === CircuitState.Isolated) return "open"
  if (state === CircuitState.HalfOpen) return "half-open"
  return "closed"
}

export function registerCircuitBreaker(name: string, policy: CircuitBreakerPolicy): void {
  if (circuitBreakers.has(name)) return
  const tracker: BreakerTracker = { policy, openCount: 0 }
  policy.onBreak(() => {
    tracker.openCount += 1
  })
  circuitBreakers.set(name, tracker)
}

export function recordAuthFailure(): void {
  authFailed += 1
}

const eventLoopMonitor = (() => {
  try {
    const monitor = monitorEventLoopDelay({ resolution: 20 })
    monitor.enable()
    return monitor
  } catch {
    return null
  }
})()

function readEventLoopLagMs(): number {
  if (!eventLoopMonitor) return 0
  const ns = eventLoopMonitor.percentile(95)
  if (!Number.isFinite(ns) || ns <= 0) return 0
  return Math.round((ns / 1_000_000) * 10) / 10
}

function roundRatio(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return Math.round((numerator / denominator) * 10_000) / 10_000
}

export function recordRequest(
  route: string,
  durationMs: number,
  cacheHit: boolean,
  status = 200,
): void {
  const key = endpoints.has(route) || endpoints.size < MAX_ROUTES ? route : "OTHER"
  const stat = endpoints.get(key) ?? {
    count: 0,
    totalMs: 0,
    cacheHits: 0,
    errors4xx: 0,
    errors5xx: 0,
    histogram: createHistogram(),
  }
  const clamped = Math.min(MAX_TRACKABLE_MS, Math.max(0, Math.round(durationMs)))
  stat.count += 1
  stat.totalMs += clamped
  if (cacheHit) stat.cacheHits += 1
  if (status >= 500) stat.errors5xx += 1
  else if (status >= 400) stat.errors4xx += 1

  if (status === 401) unauthorized401 += 1
  else if (status === 403) forbidden403 += 1
  else if (status === 429) rateLimited429 += 1

  stat.histogram.recordValue(clamped)
  globalHistogram.recordValue(clamped)
  endpoints.set(key, stat)
}

export function metricsSnapshot(): MetricsSnapshot {
  const byEndpoint: MetricsSnapshot["byEndpoint"] = [...endpoints.entries()]
    .map(([route, stat]) => ({
      route,
      count: stat.count,
      avgMs: stat.count === 0 ? 0 : Math.round(stat.totalMs / stat.count),
      p95Ms: stat.count === 0 ? 0 : Math.round(stat.histogram.getValueAtPercentile(95)),
      p99Ms: stat.count === 0 ? 0 : Math.round(stat.histogram.getValueAtPercentile(99)),
      cacheHits: stat.cacheHits,
      errorCount5xx: stat.errors5xx,
      errorRate5xx: roundRatio(stat.errors5xx, stat.count),
    }))
    .sort((a, b) => b.count - a.count || a.route.localeCompare(b.route))

  let totalQueries = 0
  let totalMs = 0
  let cacheHits = 0
  let errors4xx = 0
  let errors5xx = 0

  for (const stat of endpoints.values()) {
    totalQueries += stat.count
    totalMs += stat.totalMs
    cacheHits += stat.cacheHits
    errors4xx += stat.errors4xx
    errors5xx += stat.errors5xx
  }

  return {
    uptimeMs: Date.now() - startedAt,
    totalQueries,
    avgLatencyMs: totalQueries === 0 ? 0 : Math.round(totalMs / totalQueries),
    p50LatencyMs: totalQueries === 0 ? 0 : Math.round(globalHistogram.getValueAtPercentile(50)),
    p95LatencyMs: totalQueries === 0 ? 0 : Math.round(globalHistogram.getValueAtPercentile(95)),
    p99LatencyMs: totalQueries === 0 ? 0 : Math.round(globalHistogram.getValueAtPercentile(99)),
    cacheHitRatio: totalQueries === 0 ? 0 : Math.round((cacheHits / totalQueries) * 1000) / 1000,
    errors4xx,
    errors5xx,
    errorRate4xx: roundRatio(errors4xx, totalQueries),
    errorRate5xx: roundRatio(errors5xx, totalQueries),
    eventLoopLagMs: readEventLoopLagMs(),
    security: {
      unauthorized401,
      forbidden403,
      rateLimited429,
      authFailed,
    },
    circuitBreakers: [...circuitBreakers.entries()].map(([name, tracker]) => ({
      name,
      state: mapCircuitState(tracker.policy.state),
      openCount: tracker.openCount,
    })),
    byEndpoint,
  }
}

export function resetMetrics(): void {
  endpoints.clear()
  globalHistogram = createHistogram()
  unauthorized401 = 0
  forbidden403 = 0
  rateLimited429 = 0
  authFailed = 0
  for (const tracker of circuitBreakers.values()) {
    tracker.openCount = 0
  }
  eventLoopMonitor?.reset()
}
