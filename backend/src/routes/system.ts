import { Hono } from "hono"
import { Prisma } from "../../generated/prisma/client"
import type { AppEnv } from "../app"
import { prisma } from "../lib/prisma"
import { metricsSnapshot, resetMetrics } from "../lib/metrics"
import { rateLimit } from "../lib/rate-limit"
import { ApiError } from "../lib/errors"

/**
 * Route vận hành `/system/*` (demo kỹ thuật) — CHỈ trả số liệu vận hành:
 * uptime, số request, latency trung bình, tỉ lệ cache hit và số đếm venue.
 *
 * Bảo mật: không có query string, IP, userId hay nội dung request nào trong
 * response (metrics chỉ đếm theo route), nên không lộ dữ liệu người dùng.
 * `POST /system/reset` là thao tác ghi (xoá bộ đếm trong RAM) nên gắn rate limit
 * nhẹ theo IP để một client không thể liên tục làm rỗng số liệu quan sát.
 */

/** 10 lần reset/phút/IP — đủ cho thao tác tay, chặn vòng lặp phá số liệu. */
const RESET_RATE_LIMIT = rateLimit({ scope: "system-reset", limit: 10, windowSeconds: 60 })

interface VenueCountRow {
  total: number
  published: number
  with_images: number
  with_tags: number
  with_hours: number
}

/** Đếm venue thật trong DB — một query, không hardcode số nào. */
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

  /** Xoá bộ đếm trong RAM — KHÔNG xoá dữ liệu DB. */
  router.post("/system/reset", RESET_RATE_LIMIT, (c) => {
    // Thao tác GHI công khai chỉ chấp nhận được ở môi trường demo/dev; ở
    // production ai cũng gọi được là lỗ hổng quan sát (ai cũng xoá số liệu
    // được) → chặn hẳn.
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(403, "Reset metrics chỉ khả dụng ở môi trường demo/dev")
    }
    resetMetrics()
    return c.json({ reset: true })
  })

  return router
}
