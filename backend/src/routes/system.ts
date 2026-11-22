import { Hono } from "hono"
import type { AppEnv } from "../app"
import { recordAuditLogSafe } from "../lib/audit-log"
import { ApiError } from "../lib/errors"
import { db, sql } from "../lib/kysely"
import { metricsSnapshot, resetMetrics } from "../lib/metrics"
import { clientIp, rateLimit } from "../lib/rate-limit"
import { getViewer } from "../lib/session"

const RESET_RATE_LIMIT = rateLimit({ scope: "system-reset", limit: 10, windowSeconds: 60 })

async function countVenues(): Promise<{
  total: number
  published: number
  withImages: number
  withTags: number
  withHours: number
}> {
  const row = await db
    .selectFrom("places as p")
    .where("p.deleted_at", "is", null)
    .select([
      sql<number>`COUNT(*)::int`.as("total"),
      sql<number>`COUNT(*) FILTER (WHERE p.published_at IS NOT NULL)::int`.as("published"),
      sql<number>`COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM place_images pi WHERE pi.place_id = p.id))::int`.as(
        "with_images",
      ),
      sql<number>`COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM place_tags pt WHERE pt.place_id = p.id))::int`.as(
        "with_tags",
      ),
      sql<number>`COUNT(*) FILTER (WHERE p.opening_hours IS NOT NULL)::int`.as("with_hours"),
    ])
    .executeTakeFirst()

  return {
    total: Number(row?.total ?? 0),
    published: Number(row?.published ?? 0),
    withImages: Number(row?.with_images ?? 0),
    withTags: Number(row?.with_tags ?? 0),
    withHours: Number(row?.with_hours ?? 0),
  }
}

export function createSystemRouter() {
  const router = new Hono<AppEnv>()

  router.get("/system/stats", async (c) => {
    const [snapshot, venues] = await Promise.all([
      Promise.resolve(metricsSnapshot()),
      countVenues(),
    ])
    return c.json({
      uptimeMs: snapshot.uptimeMs,
      totalQueries: snapshot.totalQueries,
      avgLatencyMs: snapshot.avgLatencyMs,
      cacheHitRatio: snapshot.cacheHitRatio,
      byEndpoint: snapshot.byEndpoint,
      venues,
    })
  })

  router.post("/system/reset", RESET_RATE_LIMIT, async (c) => {
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(403, "Reset metrics chỉ khả dụng ở môi trường demo/dev")
    }
    resetMetrics()
    const viewer = await getViewer(c).catch(() => null)
    if (viewer) {
      const ip = clientIp(c.req.raw.headers, c.env?.remoteAddress)
      void recordAuditLogSafe({
        actorId: viewer.id,
        action: "system.metrics_reset",
        entity: "system",
        ip: ip === "unknown" ? null : ip,
      })
    }
    return c.json({ reset: true })
  })

  return router
}
