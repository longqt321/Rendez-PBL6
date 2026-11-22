import type { AdminOverview } from "@rendez/schema"
import { subHours } from "date-fns"
import type { Hono } from "hono"
import { Prisma } from "../../../generated/prisma/client"
import type { AppEnv } from "../../app"
import { env } from "../../env"
import { resolveAdminRuntimeEnv, shouldMaskAdminPii } from "../../lib/admin-privacy"
import { toApiCategory, toApiReportReason } from "../../lib/enums"
import { db, sql } from "../../lib/kysely"
import { metricsSnapshot } from "../../lib/metrics"
import { prisma } from "../../lib/prisma"
import { getRedis } from "../../lib/redis"
import { requireRole } from "../../lib/session"
import { ADMIN_CONSTANTS } from "./shared"

interface DailyTrendRow {
  date: string
  interactions: number
  reviews: number
  reports: number
  audit_logs: number
}

export function registerAdminOverviewRoutes(router: Hono<AppEnv>): void {
  router.get("/admin/overview", requireRole("admin", "moderator"), async (c) => {
    const snapshot = metricsSnapshot()
    const runtimeEnv = resolveAdminRuntimeEnv()
    const piiMasked = shouldMaskAdminPii(runtimeEnv)
    const redis = getRedis()
    const lookbackDays = ADMIN_CONSTANTS.TREND_LOOKBACK_DAYS
    const filterWindowDays = ADMIN_CONSTANTS.TREND_FILTER_WINDOW_DAYS
    const since24h = subHours(new Date(), 24)

    const [
      venueRows,
      reportStatusGroups,
      userTotal,
      userBanned,
      userRoleGroups,
      auditLogs24h,
      interactionEvents24h,
      trendRows,
      categoryTotalGroups,
      categoryPublishedGroups,
      districtRows,
      reasonTotalGroups,
      reasonPendingGroups,
    ] = await Promise.all([
      db
        .selectFrom("places as p")
        .where("p.deleted_at", "is", null)
        .select([
          sql<number>`COUNT(*)::int`.as("total"),
          sql<number>`COUNT(*) FILTER (WHERE p.published_at IS NOT NULL)::int`.as("published"),
          sql<number>`COUNT(*) FILTER (WHERE p.published_at IS NULL)::int`.as("unpublished"),
          sql<number>`COUNT(*) FILTER (WHERE p.status = 'closed')::int`.as("closed"),
          sql<number>`COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM place_images pi WHERE pi.place_id = p.id))::int`.as(
            "with_images",
          ),
          sql<number>`COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM place_tags pt WHERE pt.place_id = p.id))::int`.as(
            "with_tags",
          ),
          sql<number>`COUNT(*) FILTER (WHERE p.opening_hours IS NOT NULL)::int`.as("with_hours"),
        ])
        .execute(),
      prisma.placeReport.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, bannedAt: { not: null } } }),
      prisma.user.groupBy({
        by: ["role"],
        where: { deletedAt: null },
        _count: { role: true },
      }),
      prisma.auditLog.count({ where: { createdAt: { gte: since24h } } }),
      prisma.interactionEvent.count({ where: { createdAt: { gte: since24h } } }),
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
      prisma.place.groupBy({
        by: ["category"],
        where: { deletedAt: null },
        _count: { category: true },
        orderBy: { _count: { category: "desc" } },
      }),
      prisma.place.groupBy({
        by: ["category"],
        where: { deletedAt: null, publishedAt: { not: null } },
        _count: { category: true },
      }),
      db
        .selectFrom("places as p")
        .where("p.deleted_at", "is", null)
        .select([
          sql<string>`COALESCE(NULLIF(TRIM(p.district), ''), 'Chưa rõ')`.as("district"),
          sql<number>`COUNT(*) FILTER (WHERE p.published_at IS NOT NULL AND p.status <> 'closed')::int`.as(
            "published",
          ),
          sql<number>`COUNT(*) FILTER (WHERE p.published_at IS NULL)::int`.as("unpublished"),
          sql<number>`COUNT(*) FILTER (WHERE p.status = 'closed')::int`.as("closed"),
        ])
        .groupBy(sql`COALESCE(NULLIF(TRIM(p.district), ''), 'Chưa rõ')`)
        .orderBy(sql`COUNT(*)`, "desc")
        .orderBy(sql`COALESCE(NULLIF(TRIM(p.district), ''), 'Chưa rõ')`, "asc")
        .execute(),
      prisma.placeReport.groupBy({
        by: ["reason"],
        _count: { reason: true },
        orderBy: { _count: { reason: "desc" } },
      }),
      prisma.placeReport.groupBy({
        by: ["reason"],
        where: { status: "pending" },
        _count: { reason: true },
      }),
    ])

    const v = venueRows[0]

    const reportCounts = Object.fromEntries(
      reportStatusGroups.map((g) => [g.status, g._count.status]),
    )
    const pendingReports = reportCounts.pending ?? 0
    const reviewedReports = reportCounts.reviewed ?? 0
    const dismissedReports = reportCounts.dismissed ?? 0

    const roleCounts = Object.fromEntries(userRoleGroups.map((g) => [g.role, g._count.role]))
    const publishedByCategory = new Map(
      categoryPublishedGroups.map((g) => [g.category, g._count.category]),
    )
    const pendingByReason = new Map(reasonPendingGroups.map((g) => [g.reason, g._count.reason]))

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
        pending: pendingReports,
        reviewed: reviewedReports,
        dismissed: dismissedReports,
        total: pendingReports + reviewedReports + dismissedReports,
      },
      users: {
        total: userTotal,
        active: userTotal - userBanned,
        banned: userBanned,
        admins: roleCounts.admin ?? 0,
        moderators: roleCounts.moderator ?? 0,
      },
      activity: {
        auditLogs24h,
        interactionEvents24h,
      },
      trends14d: trendRows.map((row) => ({
        date: row.date,
        interactions: Number(row.interactions),
        reviews: Number(row.reviews),
        reports: Number(row.reports),
        auditLogs: Number(row.audit_logs),
      })),
      venuesByCategory: categoryTotalGroups.map((row) => ({
        category: toApiCategory(row.category),
        total: row._count.category,
        published: publishedByCategory.get(row.category) ?? 0,
      })),
      venuesByDistrict: districtRows.map((row) => ({
        district: row.district,
        published: Number(row.published),
        unpublished: Number(row.unpublished),
        closed: Number(row.closed),
      })),
      reportsByReason: reasonTotalGroups.map((row) => ({
        reason: toApiReportReason(row.reason),
        pending: pendingByReason.get(row.reason) ?? 0,
        total: row._count.reason,
      })),
    }

    return c.json(overview)
  })
}
