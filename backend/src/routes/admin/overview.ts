import type { AdminOverview } from "@rendez/schema"
import type { Hono } from "hono"
import { Prisma } from "../../../generated/prisma/client"
import type { AppEnv } from "../../app"
import { env } from "../../env"
import { resolveAdminRuntimeEnv, shouldMaskAdminPii } from "../../lib/admin-privacy"
import { toApiCategory, toApiReportReason } from "../../lib/enums"
import { metricsSnapshot } from "../../lib/metrics"
import { prisma } from "../../lib/prisma"
import { getRedis } from "../../lib/redis"
import { requireRole } from "../../lib/session"
import { ADMIN_CONSTANTS } from "./shared"

interface VenueStatsRow {
  total: number
  published: number
  unpublished: number
  closed: number
  with_images: number
  with_tags: number
  with_hours: number
}

interface ReportStatsRow {
  pending: number
  reviewed: number
  dismissed: number
  total: number
}

interface UserStatsRow {
  total: number
  active: number
  banned: number
  admins: number
  moderators: number
}

interface ActivityStatsRow {
  audit_logs_24h: number
  interaction_events_24h: number
}

interface DailyTrendRow {
  date: string
  interactions: number
  reviews: number
  reports: number
  audit_logs: number
}

interface CategoryBreakdownRow {
  category: string
  total: number
  published: number
}

interface DistrictBreakdownRow {
  district: string
  published: number
  unpublished: number
  closed: number
}

interface ReportReasonBreakdownRow {
  reason: string
  pending: number
  total: number
}

export function registerAdminOverviewRoutes(router: Hono<AppEnv>): void {
  router.get("/admin/overview", requireRole("admin", "moderator"), async (c) => {
    const snapshot = metricsSnapshot()
    const runtimeEnv = resolveAdminRuntimeEnv()
    const piiMasked = shouldMaskAdminPii(runtimeEnv)
    const redis = getRedis()
    const lookbackDays = ADMIN_CONSTANTS.TREND_LOOKBACK_DAYS
    const filterWindowDays = ADMIN_CONSTANTS.TREND_FILTER_WINDOW_DAYS

    const [
      venueRows,
      reportRows,
      userRows,
      activityRows,
      trendRows,
      categoryRows,
      districtRows,
      reasonRows,
    ] = await Promise.all([
      prisma.$queryRaw<VenueStatsRow[]>(Prisma.sql`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE p.published_at IS NOT NULL)::int AS published,
               COUNT(*) FILTER (WHERE p.published_at IS NULL)::int AS unpublished,
               COUNT(*) FILTER (WHERE p.status = 'closed')::int AS closed,
               COUNT(*) FILTER (
                 WHERE EXISTS (SELECT 1 FROM place_images pi WHERE pi.place_id = p.id)
               )::int AS with_images,
               COUNT(*) FILTER (
                 WHERE EXISTS (SELECT 1 FROM place_tags pt WHERE pt.place_id = p.id)
               )::int AS with_tags,
               COUNT(*) FILTER (WHERE p.opening_hours IS NOT NULL)::int AS with_hours
        FROM places p
        WHERE p.deleted_at IS NULL
      `),
      prisma.$queryRaw<ReportStatsRow[]>(Prisma.sql`
        SELECT COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
               COUNT(*) FILTER (WHERE status = 'reviewed')::int AS reviewed,
               COUNT(*) FILTER (WHERE status = 'dismissed')::int AS dismissed,
               COUNT(*)::int AS total
        FROM place_reports
      `),
      prisma.$queryRaw<UserStatsRow[]>(Prisma.sql`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE banned_at IS NULL)::int AS active,
               COUNT(*) FILTER (WHERE banned_at IS NOT NULL)::int AS banned,
               COUNT(*) FILTER (WHERE role = 'admin')::int AS admins,
               COUNT(*) FILTER (WHERE role = 'moderator')::int AS moderators
        FROM users
        WHERE deleted_at IS NULL
      `),
      prisma.$queryRaw<ActivityStatsRow[]>(Prisma.sql`
        SELECT
          (SELECT COUNT(*)::int FROM audit_logs WHERE created_at >= NOW() - INTERVAL '24 hours') AS audit_logs_24h,
          (SELECT COUNT(*)::int FROM interaction_events WHERE created_at >= NOW() - INTERVAL '24 hours') AS interaction_events_24h
      `),
      prisma.$queryRaw<DailyTrendRow[]>(Prisma.sql`
        WITH days AS (
          SELECT generate_series(
            date_trunc('day', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') - (${lookbackDays} * INTERVAL '1 day'),
            date_trunc('day', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'),
            INTERVAL '1 day'
          )::date AS day
        ),
        ie AS (
          SELECT (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day, COUNT(*)::int AS cnt
          FROM interaction_events
          WHERE created_at >= NOW() - (${filterWindowDays} * INTERVAL '1 day')
          GROUP BY 1
        ),
        rv AS (
          SELECT (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day, COUNT(*)::int AS cnt
          FROM reviews
          WHERE deleted_at IS NULL AND created_at >= NOW() - (${filterWindowDays} * INTERVAL '1 day')
          GROUP BY 1
        ),
        rp AS (
          SELECT (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day, COUNT(*)::int AS cnt
          FROM place_reports
          WHERE created_at >= NOW() - (${filterWindowDays} * INTERVAL '1 day')
          GROUP BY 1
        ),
        al AS (
          SELECT (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day, COUNT(*)::int AS cnt
          FROM audit_logs
          WHERE created_at >= NOW() - (${filterWindowDays} * INTERVAL '1 day')
          GROUP BY 1
        )
        SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
               COALESCE(ie.cnt, 0)::int AS interactions,
               COALESCE(rv.cnt, 0)::int AS reviews,
               COALESCE(rp.cnt, 0)::int AS reports,
               COALESCE(al.cnt, 0)::int AS audit_logs
        FROM days d
        LEFT JOIN ie ON ie.day = d.day
        LEFT JOIN rv ON rv.day = d.day
        LEFT JOIN rp ON rp.day = d.day
        LEFT JOIN al ON al.day = d.day
        ORDER BY d.day ASC
      `),
      prisma.$queryRaw<CategoryBreakdownRow[]>(Prisma.sql`
        SELECT p.category::text AS category,
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE p.published_at IS NOT NULL)::int AS published
        FROM places p
        WHERE p.deleted_at IS NULL
        GROUP BY p.category
        ORDER BY total DESC
      `),
      prisma.$queryRaw<DistrictBreakdownRow[]>(Prisma.sql`
        SELECT COALESCE(NULLIF(TRIM(p.district), ''), 'Chưa rõ') AS district,
               COUNT(*) FILTER (WHERE p.published_at IS NOT NULL AND p.status <> 'closed')::int AS published,
               COUNT(*) FILTER (WHERE p.published_at IS NULL)::int AS unpublished,
               COUNT(*) FILTER (WHERE p.status = 'closed')::int AS closed
        FROM places p
        WHERE p.deleted_at IS NULL
        GROUP BY 1
        ORDER BY COUNT(*) DESC, 1 ASC
      `),
      prisma.$queryRaw<ReportReasonBreakdownRow[]>(Prisma.sql`
        SELECT pr.reason::text AS reason,
               COUNT(*) FILTER (WHERE pr.status = 'pending')::int AS pending,
               COUNT(*)::int AS total
        FROM place_reports pr
        GROUP BY pr.reason
        ORDER BY total DESC
      `),
    ])

    const v = venueRows[0]
    const r = reportRows[0]
    const u = userRows[0]
    const a = activityRows[0]

    const overview: AdminOverview = {
      uptimeMs: snapshot.uptimeMs,
      totalQueries: snapshot.totalQueries,
      avgLatencyMs: snapshot.avgLatencyMs,
      cacheHitRatio: snapshot.cacheHitRatio,
      byEndpoint: snapshot.byEndpoint,
      runtime: {
        env: runtimeEnv,
        piiMasked,
        redisConnected: Boolean(redis?.connected),
        mailConfigured: env.mailConfigured,
        mediaStorage: env.r2Configured ? "r2" : "local",
        demoAutoVerifyEmail: process.env.DEMO_AUTO_VERIFY_EMAIL === "true",
      },
      venues: {
        total: Number(v?.total ?? 0),
        published: Number(v?.published ?? 0),
        unpublished: Number(v?.unpublished ?? 0),
        closed: Number(v?.closed ?? 0),
        withImages: Number(v?.with_images ?? 0),
        withTags: Number(v?.with_tags ?? 0),
        withHours: Number(v?.with_hours ?? 0),
      },
      reports: {
        pending: Number(r?.pending ?? 0),
        reviewed: Number(r?.reviewed ?? 0),
        dismissed: Number(r?.dismissed ?? 0),
        total: Number(r?.total ?? 0),
      },
      users: {
        total: Number(u?.total ?? 0),
        active: Number(u?.active ?? 0),
        banned: Number(u?.banned ?? 0),
        admins: Number(u?.admins ?? 0),
        moderators: Number(u?.moderators ?? 0),
      },
      activity: {
        auditLogs24h: Number(a?.audit_logs_24h ?? 0),
        interactionEvents24h: Number(a?.interaction_events_24h ?? 0),
      },
      trends14d: trendRows.map((row) => ({
        date: row.date,
        interactions: Number(row.interactions),
        reviews: Number(row.reviews),
        reports: Number(row.reports),
        auditLogs: Number(row.audit_logs),
      })),
      venuesByCategory: categoryRows.map((row) => ({
        category: toApiCategory(row.category),
        total: Number(row.total),
        published: Number(row.published),
      })),
      venuesByDistrict: districtRows.map((row) => ({
        district: row.district,
        published: Number(row.published),
        unpublished: Number(row.unpublished),
        closed: Number(row.closed),
      })),
      reportsByReason: reasonRows.map((row) => ({
        reason: toApiReportReason(row.reason),
        pending: Number(row.pending),
        total: Number(row.total),
      })),
    }

    return c.json(overview)
  })
}
