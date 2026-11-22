import type { Hono } from "hono"
import { Prisma } from "../../../generated/prisma/client"
import type { AppEnv } from "../../app"
import { sanitizeObservabilityMessage, shouldMaskAdminPii } from "../../lib/admin-privacy"
import { metricsSnapshot } from "../../lib/metrics"
import { listObservabilityEvents } from "../../lib/observability-store"
import { prisma } from "../../lib/prisma"
import { requireRole } from "../../lib/session"
import { ADMIN_CONSTANTS } from "./shared"

const CORE_VITAL_NAMES = ["LCP", "INP", "CLS"] as const
type CoreVitalName = (typeof CORE_VITAL_NAMES)[number]

export function registerAdminObservabilityRoutes(router: Hono<AppEnv>): void {
  router.get("/admin/observability", requireRole("admin"), async (c) => {
    const kindFilter = c.req.query("kind")?.trim() ?? "all"
    const searchQ = c.req.query("q")?.trim().toLowerCase() ?? ""

    const [snapshot, allEvents, behaviorRows, slowSqlRows] = await Promise.all([
      Promise.resolve(metricsSnapshot()),
      listObservabilityEvents(ADMIN_CONSTANTS.OBSERVABILITY_RING_LIMIT),
      prisma.$queryRaw<{ event_type: string; total: number }[]>(Prisma.sql`
        SELECT event_type, COUNT(*)::int AS total
        FROM interaction_events
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY event_type
        ORDER BY total DESC
        LIMIT ${ADMIN_CONSTANTS.OBSERVABILITY_BEHAVIOR_LIMIT}
      `),
      prisma
        .$queryRaw<
          { query: string; calls: number; mean_ms: number; total_ms: number; rows: number }[]
        >(
          Prisma.sql`
            SELECT LEFT(query, ${ADMIN_CONSTANTS.OBSERVABILITY_SQL_PREVIEW_LEN}) AS query,
                   calls::int AS calls,
                   ROUND(mean_exec_time::numeric, 2)::float8 AS mean_ms,
                   ROUND(total_exec_time::numeric, 1)::float8 AS total_ms,
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
    const vitalsMap = new Map<CoreVitalName, { values: number[]; poor: number; good: number }>()

    for (const ev of allEvents) {
      if (ev.kind === "server_error" || ev.kind === "client_error") errorCount += 1
      else if (ev.kind === "slow_request") slowCount += 1
      if (
        ev.kind === "web_vital" &&
        (ev.metric === "LCP" || ev.metric === "INP" || ev.metric === "CLS") &&
        typeof ev.value === "number"
      ) {
        const entry = vitalsMap.get(ev.metric) ?? { values: [], poor: 0, good: 0 }
        entry.values.push(ev.value)
        if (ev.rating === "poor") entry.poor += 1
        else if (ev.rating === "good") entry.good += 1
        vitalsMap.set(ev.metric, entry)
      }
    }

    const webVitals = CORE_VITAL_NAMES.map((name) => {
      const entry = vitalsMap.get(name)
      if (!entry || entry.values.length === 0) {
        return { name, p75: null, samples: 0, poor: 0, good: 0 }
      }
      const sorted = [...entry.values].sort((a, b) => a - b)
      const idx = Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil(ADMIN_CONSTANTS.WEB_VITALS_PERCENTILE * sorted.length) - 1),
      )
      const decimals = name === "CLS" ? ADMIN_CONSTANTS.CLS_DECIMAL_PLACES : 0
      return {
        name,
        p75: Number((sorted[idx] ?? 0).toFixed(decimals)),
        samples: entry.values.length,
        poor: entry.poor,
        good: entry.good,
      }
    })

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
        byEndpoint: snapshot.byEndpoint.slice(0, ADMIN_CONSTANTS.OBSERVABILITY_TOP_ENDPOINTS),
      },
      webVitals,
      slowSql: slowSqlRows.map((row) => ({
        query: row.query,
        calls: Number(row.calls),
        meanMs: Number(row.mean_ms),
        totalMs: Number(row.total_ms),
        rows: Number(row.rows),
      })),
      behavior24h: behaviorRows.map((row) => ({
        eventType: row.event_type,
        count: Number(row.total),
      })),
      summary: { errorCount, slowCount },
      events: filteredEvents,
    })
  })
}
