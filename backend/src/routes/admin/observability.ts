import { subHours } from "date-fns"
import { countBy, groupBy } from "es-toolkit"
import type { Hono } from "hono"
import { quantile } from "simple-statistics"
import { Prisma } from "../../../generated/prisma/client"
import type { AppEnv } from "../../app"
import { sanitizeObservabilityMessage, shouldMaskAdminPii } from "../../lib/admin-privacy"
import { metricsSnapshot } from "../../lib/metrics"
import { listObservabilityEvents } from "../../lib/observability-store"
import { getDbPoolStats, prisma } from "../../lib/prisma"
import { getRedis } from "../../lib/redis"
import { requireRole } from "../../lib/session"
import { ADMIN_CONSTANTS } from "./shared"

const CORE_VITAL_NAMES = ["LCP", "INP", "CLS"] as const
type CoreVitalName = (typeof CORE_VITAL_NAMES)[number]

const BYTES_PER_MB = 1024 * 1024
const TOP_ZERO_QUERIES_LIMIT = 6
const SEARCH_SAMPLE_LIMIT = 500

function isZeroResultSearch(context: unknown): boolean {
  if (!context || typeof context !== "object") return false
  const record = context as Record<string, unknown>
  return record.resultCount === 0 || record.total === 0 || record.zeroResult === true
}

export function registerAdminObservabilityRoutes(router: Hono<AppEnv>): void {
  router.get("/admin/observability", requireRole("admin"), async (c) => {
    const kindFilter = c.req.query("kind")?.trim() ?? "all"
    const searchQ = c.req.query("q")?.trim().toLowerCase() ?? ""
    const since24h = subHours(new Date(), 24)

    const [snapshot, allEvents, behaviorGroups, searchEvents, slowSqlRows] = await Promise.all([
      Promise.resolve(metricsSnapshot()),
      listObservabilityEvents(ADMIN_CONSTANTS.OBSERVABILITY_RING_LIMIT),
      prisma.interactionEvent.groupBy({
        by: ["eventType"],
        where: { createdAt: { gte: since24h } },
        _count: { eventType: true },
        orderBy: { _count: { eventType: "desc" } },
        take: ADMIN_CONSTANTS.OBSERVABILITY_BEHAVIOR_LIMIT,
      }),
      prisma.interactionEvent.findMany({
        where: {
          createdAt: { gte: since24h },
          eventType: { in: ["search", "search_query", "search_zero_result"] },
        },
        select: { eventType: true, query: true, context: true },
        orderBy: { createdAt: "desc" },
        take: SEARCH_SAMPLE_LIMIT,
      }),
      prisma
        .$queryRaw<
          { query: string; calls: number; mean_ms: number; total_ms: number; rows: number }[]
        >(
          Prisma.sql`
            SELECT LEFT(query, 240) AS query,
                   calls::int AS calls,
                   ROUND(mean_exec_time::numeric, 1)::float AS mean_ms,
                   ROUND(total_exec_time::numeric, 1)::float AS total_ms,
                   rows::int AS rows
            FROM pg_stat_statements
            WHERE query NOT ILIKE '%pg_stat_statements%'
            ORDER BY mean_exec_time DESC
            LIMIT ${ADMIN_CONSTANTS.OBSERVABILITY_SLOW_SQL_LIMIT}
          `,
        )
        .catch(() => []),
    ])

    let errorCount = 0
    let slowCount = 0
    for (const ev of allEvents) {
      if (ev.kind === "server_error" || ev.kind === "client_error") errorCount += 1
      else if (ev.kind === "slow_request") slowCount += 1
    }

    const vitalEventsByMetric = groupBy(
      allEvents.filter(
        (ev): ev is typeof ev & { metric: CoreVitalName; value: number } =>
          ev.kind === "web_vital" &&
          (ev.metric === "LCP" || ev.metric === "INP" || ev.metric === "CLS") &&
          typeof ev.value === "number",
      ),
      (ev) => ev.metric,
    )

    const webVitals = CORE_VITAL_NAMES.map((name) => {
      const items = vitalEventsByMetric[name] ?? []
      if (items.length === 0) {
        return { name, p75: null, samples: 0, poor: 0, good: 0 }
      }
      const p75Value = quantile(
        items.map((ev) => ev.value),
        ADMIN_CONSTANTS.WEB_VITALS_PERCENTILE,
      )
      const decimals = name === "CLS" ? ADMIN_CONSTANTS.CLS_DECIMAL_PLACES : 0
      return {
        name,
        p75: Number(p75Value.toFixed(decimals)),
        samples: items.length,
        poor: items.filter((ev) => ev.rating === "poor").length,
        good: items.filter((ev) => ev.rating === "good").length,
      }
    })

    const zeroResultEvents = searchEvents.filter(
      (ev) => ev.eventType === "search_zero_result" || isZeroResultSearch(ev.context),
    )
    const zeroQueryCounts = countBy(
      zeroResultEvents
        .map((ev) => ev.query?.trim().toLowerCase() ?? "")
        .filter((q) => q.length > 0),
      (q) => q,
    )
    const topZeroQueries = Object.entries(zeroQueryCounts)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_ZERO_QUERIES_LIMIT)

    const totalSearches = searchEvents.length
    const zeroResultSearches = zeroResultEvents.length
    const zeroResultRate =
      totalSearches === 0 ? 0 : Math.round((zeroResultSearches / totalSearches) * 1000) / 1000

    const mem = process.memoryUsage()
    const redis = getRedis()

    const maskPii = shouldMaskAdminPii()
    const filteredEvents = allEvents
      .filter((ev) => kindFilter === "all" || ev.kind === kindFilter)
      .filter((ev) => {
        if (!searchQ) return true
        return (
          (ev.route?.toLowerCase().includes(searchQ) ?? false) ||
          (ev.traceId?.toLowerCase().includes(searchQ) ?? false) ||
          (ev.requestId?.toLowerCase().includes(searchQ) ?? false) ||
          (ev.message?.toLowerCase().includes(searchQ) ?? false)
        )
      })
      .slice(0, ADMIN_CONSTANTS.OBSERVABILITY_RETURN_LIMIT)
      .map((ev) => ({
        ...ev,
        message: sanitizeObservabilityMessage(ev.message, maskPii),
      }))

    return c.json({
      latency: {
        uptimeMs: snapshot.uptimeMs,
        totalQueries: snapshot.totalQueries,
        avgLatencyMs: snapshot.avgLatencyMs,
        p50LatencyMs: snapshot.p50LatencyMs,
        p95LatencyMs: snapshot.p95LatencyMs,
        p99LatencyMs: snapshot.p99LatencyMs,
        cacheHitRatio: snapshot.cacheHitRatio,
        errors4xx: snapshot.errors4xx,
        errors5xx: snapshot.errors5xx,
        errorRate4xx: snapshot.errorRate4xx,
        errorRate5xx: snapshot.errorRate5xx,
        byEndpoint: snapshot.byEndpoint.slice(0, ADMIN_CONSTANTS.OBSERVABILITY_TOP_ENDPOINTS),
      },
      security: snapshot.security,
      infrastructure: {
        dbPool: getDbPoolStats(),
        memoryRssMb: Math.round(mem.rss / BYTES_PER_MB),
        heapUsedMb: Math.round(mem.heapUsed / BYTES_PER_MB),
        heapTotalMb: Math.round(mem.heapTotal / BYTES_PER_MB),
        redisConnected: Boolean(redis?.connected),
      },
      searchQuality24h: {
        totalSearches,
        zeroResultSearches,
        zeroResultRate,
        topZeroQueries,
      },
      webVitals,
      slowSql: slowSqlRows.map((row) => ({
        query: row.query,
        calls: Number(row.calls),
        meanMs: Number(row.mean_ms),
        totalMs: Number(row.total_ms),
        rows: Number(row.rows),
      })),
      behavior24h: behaviorGroups.map((row) => ({
        eventType: row.eventType,
        count: row._count.eventType,
      })),
      summary: { errorCount, slowCount },
      events: filteredEvents,
    })
  })
}
