export interface EndpointStat {
  route: string
  count: number
  totalMs: number
  cacheHits: number
  samples: number[]
}

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

const endpoints = new Map<
  string,
  { count: number; totalMs: number; cacheHits: number; samples: number[] }
>()

const MAX_ROUTES = 200
const MAX_SAMPLES_PER_ROUTE = 512

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx] ?? 0
}

export function recordRequest(route: string, durationMs: number, cacheHit: boolean): void {
  const key = endpoints.has(route) || endpoints.size < MAX_ROUTES ? route : "OTHER"
  const stat = endpoints.get(key) ?? { count: 0, totalMs: 0, cacheHits: 0, samples: [] }
  const clamped = Math.max(0, Math.round(durationMs))
  stat.count += 1
  stat.totalMs += clamped
  if (cacheHit) stat.cacheHits += 1
  if (stat.samples.length >= MAX_SAMPLES_PER_ROUTE) {
    stat.samples.shift()
  }
  stat.samples.push(clamped)
  endpoints.set(key, stat)
}

export function metricsSnapshot(): MetricsSnapshot {
  const allSamples: number[] = []
  const byEndpoint: MetricsSnapshot["byEndpoint"] = [...endpoints.entries()]
    .map(([route, stat]) => {
      const sorted = [...stat.samples].sort((a, b) => a - b)
      allSamples.push(...sorted)
      return {
        route,
        count: stat.count,
        avgMs: stat.count === 0 ? 0 : Math.round(stat.totalMs / stat.count),
        p95Ms: percentile(sorted, 95),
        p99Ms: percentile(sorted, 99),
        cacheHits: stat.cacheHits,
      }
    })
    // Nhiều request nhất lên đầu; hoà thì theo tên route để thứ tự ổn định.
    .sort((a, b) => b.count - a.count || a.route.localeCompare(b.route))

  allSamples.sort((a, b) => a - b)
  const totalQueries = byEndpoint.reduce((sum, entry) => sum + entry.count, 0)
  const totalMs = [...endpoints.values()].reduce((sum, stat) => sum + stat.totalMs, 0)
  const cacheHits = [...endpoints.values()].reduce((sum, stat) => sum + stat.cacheHits, 0)

  return {
    uptimeMs: Date.now() - startedAt,
    totalQueries,
    avgLatencyMs: totalQueries === 0 ? 0 : Math.round(totalMs / totalQueries),
    p50LatencyMs: percentile(allSamples, 50),
    p95LatencyMs: percentile(allSamples, 95),
    p99LatencyMs: percentile(allSamples, 99),
    // 3 chữ số thập phân là đủ để thấy cache có tác dụng, không giả vờ chính xác hơn.
    cacheHitRatio: totalQueries === 0 ? 0 : Math.round((cacheHits / totalQueries) * 1000) / 1000,
    byEndpoint,
  }
}

export function resetMetrics(): void {
  endpoints.clear()
}
