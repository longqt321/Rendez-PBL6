export interface EndpointStat {
  route: string
  count: number
  totalMs: number
  cacheHits: number
}

export interface MetricsSnapshot {
  uptimeMs: number
  totalQueries: number
  avgLatencyMs: number
  cacheHitRatio: number
  byEndpoint: { route: string; count: number; avgMs: number; cacheHits: number }[]
}

const startedAt = Date.now()

const endpoints = new Map<string, { count: number; totalMs: number; cacheHits: number }>()

const MAX_ROUTES = 200

export function recordRequest(route: string, durationMs: number, cacheHit: boolean): void {
  const key = endpoints.has(route) || endpoints.size < MAX_ROUTES ? route : "OTHER"
  const stat = endpoints.get(key) ?? { count: 0, totalMs: 0, cacheHits: 0 }
  stat.count += 1
  stat.totalMs += Math.max(0, durationMs)
  if (cacheHit) stat.cacheHits += 1
  endpoints.set(key, stat)
}

export function metricsSnapshot(): MetricsSnapshot {
  const byEndpoint: MetricsSnapshot["byEndpoint"] = [...endpoints.entries()]
    .map(([route, stat]) => ({
      route,
      count: stat.count,
      avgMs: stat.count === 0 ? 0 : Math.round(stat.totalMs / stat.count),
      cacheHits: stat.cacheHits,
    }))
    // Nhiều request nhất lên đầu; hoà thì theo tên route để thứ tự ổn định.
    .sort((a, b) => b.count - a.count || a.route.localeCompare(b.route))

  const totalQueries = byEndpoint.reduce((sum, entry) => sum + entry.count, 0)
  const totalMs = [...endpoints.values()].reduce((sum, stat) => sum + stat.totalMs, 0)
  const cacheHits = [...endpoints.values()].reduce((sum, stat) => sum + stat.cacheHits, 0)

  return {
    uptimeMs: Date.now() - startedAt,
    totalQueries,
    avgLatencyMs: totalQueries === 0 ? 0 : Math.round(totalMs / totalQueries),
    // 3 chữ số thập phân là đủ để thấy cache có tác dụng, không giả vờ chính xác hơn.
    cacheHitRatio: totalQueries === 0 ? 0 : Math.round((cacheHits / totalQueries) * 1000) / 1000,
    byEndpoint,
  }
}

export function resetMetrics(): void {
  endpoints.clear()
}
