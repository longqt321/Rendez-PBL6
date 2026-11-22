import * as hdr from "hdr-histogram-js"

export interface MetricsSnapshot {
  uptimeMs: number
  totalQueries: number
  avgLatencyMs: number
  p50LatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number
  cacheHitRatio: number
  byEndpoint: {
    route: string
    count: number
    avgMs: number
    p95Ms: number
    p99Ms: number
    cacheHits: number
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

const endpoints = new Map<
  string,
  { count: number; totalMs: number; cacheHits: number; histogram: RouteHistogram }
>()

let globalHistogram = createHistogram()

export function recordRequest(route: string, durationMs: number, cacheHit: boolean): void {
  const key = endpoints.has(route) || endpoints.size < MAX_ROUTES ? route : "OTHER"
  const stat = endpoints.get(key) ?? {
    count: 0,
    totalMs: 0,
    cacheHits: 0,
    histogram: createHistogram(),
  }
  const clamped = Math.min(MAX_TRACKABLE_MS, Math.max(0, Math.round(durationMs)))
  stat.count += 1
  stat.totalMs += clamped
  if (cacheHit) stat.cacheHits += 1
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
    }))
    .sort((a, b) => b.count - a.count || a.route.localeCompare(b.route))

  const totalQueries = byEndpoint.reduce((sum, entry) => sum + entry.count, 0)
  const totalMs = [...endpoints.values()].reduce((sum, stat) => sum + stat.totalMs, 0)
  const cacheHits = [...endpoints.values()].reduce((sum, stat) => sum + stat.cacheHits, 0)

  return {
    uptimeMs: Date.now() - startedAt,
    totalQueries,
    avgLatencyMs: totalQueries === 0 ? 0 : Math.round(totalMs / totalQueries),
    p50LatencyMs: totalQueries === 0 ? 0 : Math.round(globalHistogram.getValueAtPercentile(50)),
    p95LatencyMs: totalQueries === 0 ? 0 : Math.round(globalHistogram.getValueAtPercentile(95)),
    p99LatencyMs: totalQueries === 0 ? 0 : Math.round(globalHistogram.getValueAtPercentile(99)),
    cacheHitRatio: totalQueries === 0 ? 0 : Math.round((cacheHits / totalQueries) * 1000) / 1000,
    byEndpoint,
  }
}

export function resetMetrics(): void {
  endpoints.clear()
  globalHistogram = createHistogram()
}
