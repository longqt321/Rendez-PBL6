import { Hono } from "hono"
import { Prisma } from "../../generated/prisma/client"
import type { AppEnv } from "../app"
import { prisma } from "../lib/prisma"
import { metricsSnapshot, resetMetrics } from "../lib/metrics"
import { clientIp, rateLimit } from "../lib/rate-limit"
import { ApiError } from "../lib/errors"
import { getViewer } from "../lib/session"
import { recordAuditLogSafe } from "../lib/audit-log"

const RESET_RATE_LIMIT = rateLimit({ scope: "system-reset", limit: 10, windowSeconds: 60 })

interface VenueCountRow {
  total: number
  published: number
  with_images: number
  with_tags: number
  with_hours: number
}

async function countVenues(): Promise<{
  total: number
  published: number
  withImages: number
  withTags: number
  withHours: number
}> {
  const rows = await prisma.$queryRaw<VenueCountRow[]>(Prisma.sql`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE p.published_at IS NOT NULL)::int AS published,
           COUNT(*) FILTER (
             WHERE EXISTS (SELECT 1 FROM place_images pi WHERE pi.place_id = p.id)
           )::int AS with_images,
           COUNT(*) FILTER (
             WHERE p.tags IS NOT NULL AND array_length(p.tags, 1) > 0
           )::int AS with_tags,
           COUNT(*) FILTER (WHERE p.opening_hours IS NOT NULL)::int AS with_hours
    FROM places p
    WHERE p.deleted_at IS NULL
  `)
  const row = rows[0]
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
    // Thao tác GHI công khai chỉ chấp nhận được ở môi trường demo/dev; ở
    // production ai cũng gọi được là lỗ hổng quan sát (ai cũng xoá số liệu
    // được) → chặn hẳn.
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
