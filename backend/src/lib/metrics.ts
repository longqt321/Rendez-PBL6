/**
 * Metrics vận hành trong bộ nhớ tiến trình (demo kỹ thuật).
 *
 * Vì sao in-memory là đủ: `/system/stats` chỉ để quan sát nhanh một tiến trình
 * demo (một container API); không phải số liệu billing/SLO cần chính xác xuyên
 * nhiều replica. Không thêm bảng DB/Redis cho một nhu cầu chưa phát sinh
 * (DECISIONS 27). Khi chạy nhiều replica, mỗi replica báo số của chính nó.
 *
 * Chỉ ghi số đếm/thời gian — KHÔNG ghi query string, IP, userId hay nội dung
 * request, nên snapshot không lộ dữ liệu người dùng.
 */

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

/** Mốc khởi động module — `uptimeMs` đo từ lúc tiến trình nạp metrics. */
const startedAt = Date.now()

/** Bộ đếm theo khoá `METHOD /route`. */
const endpoints = new Map<string, { count: number; totalMs: number; cacheHits: number }>()

/** Chặn trên số khoá route — path lạ (bot quét) không làm phình bộ nhớ. */
const MAX_ROUTES = 200

/** Ghi nhận một request đã xử lý xong. `durationMs` làm tròn ở nơi gọi. */
export function recordRequest(route: string, durationMs: number, cacheHit: boolean): void {
  const key = endpoints.has(route) || endpoints.size < MAX_ROUTES ? route : "OTHER"
  const stat = endpoints.get(key) ?? { count: 0, totalMs: 0, cacheHits: 0 }
  stat.count += 1
  stat.totalMs += Math.max(0, durationMs)
  if (cacheHit) stat.cacheHits += 1
  endpoints.set(key, stat)
}

/** Snapshot số liệu hiện tại — tính toán dẫn xuất tại thời điểm đọc. */
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

/** Xoá toàn bộ bộ đếm (KHÔNG chạm DB) — `POST /system/reset`. */
export function resetMetrics(): void {
  endpoints.clear()
}
