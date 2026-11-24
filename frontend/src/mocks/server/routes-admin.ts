import type { PlaceCategory } from "@/features/places/types/place"
import { type AdminOverview, type AdminReport, type AdminReportStatus } from "@rendez/schema"
import { normalizeText } from "../text"
import {
  updateAdminPlaceInputSchema,
  updateAdminReportInputSchema,
  updateAdminUserInputSchema,
} from "@rendez/schema"
import {
  db,
  requireMockRole,
  appendMockAuditLog,
  toMockAdminReport,
  toMockAdminPlace,
  toMockAdminUser,
  findPlace,
  paginate,
  RESPONSE_DELAY_MS,
  scenario,
  notFound,
  badRequest,
  parseBody,
  query,
  mockMetrics,
  type Route,
} from "./context"

export const adminMockRoutes: Route[] = [
  // -------------------------------------------------------------------------
  // Quản trị `/admin/*`
  // -------------------------------------------------------------------------
  {
    method: "get",
    pattern: /^\/admin\/overview$/,
    handler: (config) => {
      requireMockRole(config, ["admin", "moderator"])
      const byEndpoint = [...mockMetrics.routes.entries()]
        .map(([route, count]) => ({ route, count }))
        .sort((a, b) => b.count - a.count)
      const userList = Object.keys(db.users)
        .filter((id) => !db.deletedUserIds.has(id))
        .map(toMockAdminUser)
      const reports = db.reports.map(toMockAdminReport)
      const today = new Date()
      const trends14d = Array.from({ length: 14 }, (_, idx) => {
        const d = new Date(today)
        d.setDate(today.getDate() - (13 - idx))
        const date = d.toISOString().slice(0, 10)
        return {
          date,
          interactions: 20 + ((idx * 17) % 60),
          reviews: 2 + ((idx * 5) % 9),
          reports: idx % 4 === 0 ? 1 : 0,
          auditLogs: 1 + (idx % 3),
        }
      })
      const categoryCounts = new Map<
        PlaceCategory,
        { category: PlaceCategory; total: number; published: number }
      >()
      const districtCounts = new Map<
        string,
        { district: string; published: number; unpublished: number; closed: number }
      >()
      for (const place of db.places) {
        const cat = categoryCounts.get(place.category) ?? {
          category: place.category,
          total: 0,
          published: 0,
        }
        cat.total += 1
        if (place.publishedAt !== null) cat.published += 1
        categoryCounts.set(place.category, cat)

        const distName = place.district?.trim() || "Chưa rõ"
        const dist = districtCounts.get(distName) ?? {
          district: distName,
          published: 0,
          unpublished: 0,
          closed: 0,
        }
        if (place.status === "closed") dist.closed += 1
        else if (place.publishedAt === null) dist.unpublished += 1
        else dist.published += 1
        districtCounts.set(distName, dist)
      }
      const reasonCounts = new Map<
        AdminReport["reason"],
        { reason: AdminReport["reason"]; pending: number; total: number }
      >()
      for (const report of reports) {
        const entry = reasonCounts.get(report.reason) ?? {
          reason: report.reason,
          pending: 0,
          total: 0,
        }
        entry.total += 1
        if (report.status === "pending") entry.pending += 1
        reasonCounts.set(report.reason, entry)
      }
      return {
        uptimeMs: Date.now() - mockMetrics.startedAt,
        totalQueries: [...mockMetrics.routes.values()].reduce((sum, count) => sum + count, 0),
        avgLatencyMs: RESPONSE_DELAY_MS + scenario.delayMs,
        cacheHitRatio: 0.42,
        byEndpoint,
        runtime: {
          env: "development",
          piiMasked: false,
          redisConnected: false,
          mailConfigured: false,
          mediaStorage: "local",
          demoAutoVerifyEmail: true,
        },
        venues: {
          total: db.places.length,
          published: db.places.filter((p) => p.publishedAt !== null).length,
          unpublished: db.places.filter((p) => p.publishedAt === null).length,
          closed: db.places.filter((p) => p.status === "closed").length,
          withImages: db.places.filter((p) => p.imageUrl !== undefined).length,
          withTags: db.places.filter((p) => p.tags.length > 0).length,
          withHours: db.places.filter((p) => p.openingHours !== undefined).length,
        },
        reports: {
          pending: reports.filter((r) => r.status === "pending").length,
          reviewed: reports.filter((r) => r.status === "reviewed").length,
          dismissed: reports.filter((r) => r.status === "dismissed").length,
          total: reports.length,
        },
        users: {
          total: userList.length,
          active: userList.filter((u) => u.bannedAt === null).length,
          banned: userList.filter((u) => u.bannedAt !== null).length,
          admins: userList.filter((u) => u.role === "admin").length,
          moderators: userList.filter((u) => u.role === "moderator").length,
        },
        activity: {
          auditLogs24h: db.auditLogs.length,
          interactionEvents24h: 84,
        },
        trends14d,
        venuesByCategory: [...categoryCounts.values()].sort((a, b) => b.total - a.total),
        venuesByDistrict: [...districtCounts.values()].sort(
          (a, b) =>
            b.published + b.unpublished + b.closed - (a.published + a.unpublished + a.closed),
        ),
        reportsByReason: [...reasonCounts.values()].sort((a, b) => b.total - a.total),
      } satisfies AdminOverview
    },
  },
  {
    method: "get",
    pattern: /^\/admin\/reports$/,
    handler: (config) => {
      requireMockRole(config, ["admin", "moderator"])
      const { status = "pending", cursor } = query(config)
      const filtered = db.reports
        .map(toMockAdminReport)
        .filter((r) => status === "all" || r.status === (status as AdminReportStatus))
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      return paginate(filtered, cursor ?? null, 20)
    },
  },
  {
    method: "patch",
    pattern: /^\/admin\/reports\/([^/]+)$/,
    handler: (config, [reportId]) => {
      requireMockRole(config, ["admin", "moderator"])
      const report = db.reports.find((item) => item.id === reportId)
      if (!report) notFound(config, "Không tìm thấy báo cáo")
      const parsed = updateAdminReportInputSchema.safeParse(parseBody(config))
      if (!parsed.success)
        badRequest(config, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
      const now = new Date().toISOString()
      report.status = parsed.data.status
      report.updatedAt = now
      const place = findPlace(report.placeId)
      if (place) {
        if (parsed.data.placeAction === "unpublish") place.publishedAt = null
        else if (parsed.data.placeAction === "close") place.status = "closed"
        db.placeModerationState[place.id] = {
          status: parsed.data.placeAction !== "none" ? parsed.data.placeAction : "report_reviewed",
          note: parsed.data.moderationNote ?? null,
          moderatedAt: now,
        }
      }
      appendMockAuditLog("report.resolve", "place_report", report.id, {
        placeId: report.placeId,
        placeName: place?.name ?? report.placeId,
        nextStatus: parsed.data.status,
        placeAction: parsed.data.placeAction,
      })
      return toMockAdminReport(report)
    },
  },
  {
    method: "get",
    pattern: /^\/admin\/places$/,
    handler: (config) => {
      requireMockRole(config, ["admin", "moderator"])
      const { q, visibility = "all", district, category, cursor } = query(config)
      const needle = typeof q === "string" ? normalizeText(q.trim()) : ""
      const filtered = db.places
        .filter((p) => {
          if (visibility === "published" && (p.publishedAt === null || p.status === "closed"))
            return false
          if (visibility === "unpublished" && p.publishedAt !== null) return false
          if (visibility === "closed" && p.status !== "closed") return false
          if (district && district !== "all" && p.district !== district) return false
          if (category && category !== "all" && p.category !== category) return false
          if (
            needle &&
            !normalizeText(`${p.name} ${p.address} ${p.district ?? ""}`).includes(needle)
          ) {
            return false
          }
          return true
        })
        .map(toMockAdminPlace)
      return paginate(filtered, cursor ?? null, 20)
    },
  },
  {
    method: "patch",
    pattern: /^\/admin\/places\/([^/]+)$/,
    handler: (config, [placeId]) => {
      requireMockRole(config, ["admin", "moderator"])
      const place = findPlace(placeId)
      if (!place) notFound(config, "Không tìm thấy địa điểm")
      const parsed = updateAdminPlaceInputSchema.safeParse(parseBody(config))
      if (!parsed.success)
        badRequest(config, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
      const now = new Date().toISOString()
      const input = parsed.data
      if (input.published !== undefined)
        place.publishedAt = input.published ? (place.publishedAt ?? now) : null
      if (input.status !== undefined) place.status = input.status
      if (input.name !== undefined) place.name = input.name
      if (input.address !== undefined) place.address = input.address
      if (input.district !== undefined) place.district = input.district ?? undefined
      if (input.category !== undefined) place.category = input.category
      if (input.priceLevel !== undefined) place.priceLevel = input.priceLevel
      if (input.lat !== undefined) place.lat = input.lat ?? undefined
      if (input.lng !== undefined) place.lng = input.lng ?? undefined
      db.placeModerationState[place.id] = {
        status: "edited",
        note: input.moderationNote ?? null,
        moderatedAt: now,
      }
      appendMockAuditLog("place.update", "place", place.id, { name: place.name })
      return toMockAdminPlace(place)
    },
  },
  {
    method: "get",
    pattern: /^\/admin\/users$/,
    handler: (config) => {
      requireMockRole(config, ["admin"])
      const { q, role = "all", status = "all", cursor } = query(config)
      const needle = typeof q === "string" ? q.trim().toLowerCase() : ""
      const items = Object.keys(db.users)
        .filter((id) => !db.deletedUserIds.has(id))
        .map(toMockAdminUser)
        .filter((u) => {
          if (role !== "all" && u.role !== role) return false
          if (status === "active" && u.bannedAt !== null) return false
          if (status === "banned" && u.bannedAt === null) return false
          if (
            needle &&
            !u.name.toLowerCase().includes(needle) &&
            !u.handle.toLowerCase().includes(needle) &&
            !u.email.toLowerCase().includes(needle)
          ) {
            return false
          }
          return true
        })
      return paginate(items, cursor ?? null, 20)
    },
  },
  {
    method: "patch",
    pattern: /^\/admin\/users\/([^/]+)$/,
    handler: (config, [targetId]) => {
      requireMockRole(config, ["admin"])
      if (!db.users[targetId] || db.deletedUserIds.has(targetId)) {
        notFound(config, "Không tìm thấy người dùng")
      }
      const parsed = updateAdminUserInputSchema.safeParse(parseBody(config))
      if (!parsed.success)
        badRequest(config, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
      if (targetId === db.me.id && parsed.data.banned === true) {
        badRequest(config, "Không thể tự khoá tài khoản của chính mình")
      }
      if (targetId === db.me.id && parsed.data.role && parsed.data.role !== "admin") {
        badRequest(config, "Không thể tự hạ quyền của chính mình")
      }
      const current = toMockAdminUser(targetId)
      const nextRole = parsed.data.role ?? current.role
      const nextBannedAt =
        parsed.data.banned === true
          ? (current.bannedAt ?? new Date().toISOString())
          : parsed.data.banned === false
            ? null
            : current.bannedAt
      const nextBanReason =
        parsed.data.banned === false
          ? null
          : parsed.data.banReason !== undefined
            ? parsed.data.banReason
            : current.banReason
      db.userAdminState[targetId] = {
        role: nextRole,
        bannedAt: nextBannedAt,
        banReason: nextBanReason,
      }
      appendMockAuditLog(
        parsed.data.banned !== undefined
          ? parsed.data.banned
            ? "user.ban"
            : "user.unban"
          : "user.role_change",
        "user",
        targetId,
        { handle: current.handle, roleFrom: current.role, roleTo: nextRole },
      )
      return toMockAdminUser(targetId)
    },
  },
  {
    method: "get",
    pattern: /^\/admin\/audit-logs$/,
    handler: (config) => {
      requireMockRole(config, ["admin", "moderator"])
      const { entity = "all", action = "all", q, cursor } = query(config)
      const needle = typeof q === "string" ? q.trim().toLowerCase() : ""
      const items = db.auditLogs.filter((entry) => {
        if (entity !== "all" && entry.entity !== entity) return false
        if (action !== "all" && entry.action !== action) return false
        if (
          needle &&
          !entry.action.toLowerCase().includes(needle) &&
          !(entry.entityId ?? "").toLowerCase().includes(needle) &&
          !(entry.actor?.handle ?? "").toLowerCase().includes(needle)
        ) {
          return false
        }
        return true
      })
      return paginate(items, cursor ?? null, 20)
    },
  },
  {
    method: "get",
    pattern: /^\/admin\/observability$/,
    handler: (config) => {
      requireMockRole(config, ["admin"])
      const { kind = "all", q } = query(config)
      const needle = typeof q === "string" ? q.trim().toLowerCase() : ""
      const now = Date.now()
      const allEvents = [
        {
          id: "obs-1",
          kind: "slow_request" as const,
          timestamp: new Date(now - 4 * 60_000).toISOString(),
          requestId: "req-mock-001",
          traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
          method: "GET",
          route: "/api/v1/places",
          status: 200,
          durationMs: 642,
          timing: { dbMs: 310, dbCount: 4, redisMs: 12, embedMs: 265, externalMs: 0, appMs: 55 },
          source: "backend",
        },
        {
          id: "obs-2",
          kind: "slow_request" as const,
          timestamp: new Date(now - 11 * 60_000).toISOString(),
          requestId: "req-mock-002",
          traceId: "9a1c8e2144d01fa9b8ce112a5c3d9011",
          method: "GET",
          route: "/api/v1/places/recommended",
          status: 200,
          durationMs: 538,
          timing: { dbMs: 240, dbCount: 3, redisMs: 18, embedMs: 210, externalMs: 0, appMs: 70 },
          source: "backend",
        },
        {
          id: "obs-3",
          kind: "web_vital" as const,
          timestamp: new Date(now - 15 * 60_000).toISOString(),
          route: "/discover",
          metric: "LCP" as const,
          value: 1420,
          rating: "good" as const,
          source: "frontend",
        },
      ]
      const filteredEvents = allEvents.filter((ev) => {
        if (kind !== "all" && ev.kind !== kind) return false
        if (!needle) return true
        return (
          (ev.route?.toLowerCase().includes(needle) ?? false) ||
          ("traceId" in ev && (ev.traceId?.toLowerCase().includes(needle) ?? false))
        )
      })
      return {
        latency: {
          uptimeMs: Date.now() - mockMetrics.startedAt,
          totalQueries: Math.max(
            24,
            [...mockMetrics.routes.values()].reduce((sum, count) => sum + count, 0),
          ),
          avgLatencyMs: 42,
          p50LatencyMs: 28,
          p95LatencyMs: 185,
          p99LatencyMs: 540,
          cacheHitRatio: 0.68,
          errors4xx: 3,
          errors5xx: 0,
          errorRate4xx: 0.013,
          errorRate5xx: 0,
          byEndpoint: [
            {
              route: "GET /api/v1/places",
              count: 84,
              avgMs: 68,
              p95Ms: 210,
              p99Ms: 642,
              cacheHits: 52,
              errorCount5xx: 0,
              errorRate5xx: 0,
            },
            {
              route: "GET /api/v1/places/recommended",
              count: 46,
              avgMs: 92,
              p95Ms: 295,
              p99Ms: 538,
              cacheHits: 28,
              errorCount5xx: 0,
              errorRate5xx: 0,
            },
            {
              route: "GET /api/v1/posts",
              count: 38,
              avgMs: 34,
              p95Ms: 95,
              p99Ms: 140,
              cacheHits: 21,
              errorCount5xx: 0,
              errorRate5xx: 0,
            },
            {
              route: "GET /api/v1/me",
              count: 62,
              avgMs: 14,
              p95Ms: 32,
              p99Ms: 48,
              cacheHits: 0,
              errorCount5xx: 0,
              errorRate5xx: 0,
            },
          ],
        },
        security: {
          unauthorized401: 2,
          forbidden403: 1,
          rateLimited429: 0,
        },
        infrastructure: {
          dbPool: { total: 4, idle: 3, waiting: 0, max: 20 },
          memoryRssMb: 128,
          heapUsedMb: 62,
          heapTotalMb: 96,
          redisConnected: true,
        },
        searchQuality24h: {
          totalSearches: 68,
          zeroResultSearches: 4,
          zeroResultRate: 0.059,
          topZeroQueries: [
            { query: "bánh mì chay mở 24h", count: 2 },
            { query: "omakase sơn trà", count: 2 },
          ],
        },
        webVitals: [
          { name: "LCP" as const, p75: 1420, samples: 24, good: 20, poor: 1 },
          { name: "INP" as const, p75: 96, samples: 18, good: 16, poor: 0 },
          { name: "CLS" as const, p75: 0.04, samples: 24, good: 22, poor: 0 },
        ],
        slowSql: [
          {
            query:
              "SELECT p.id, p.name, p.category FROM places p WHERE p.deleted_at IS NULL ORDER BY p.created_at DESC LIMIT $1",
            calls: 128,
            meanMs: 18.4,
            totalMs: 2355.2,
            rows: 2560,
          },
          {
            query:
              "SELECT event_type, COUNT(*)::int FROM interaction_events WHERE created_at >= NOW() - INTERVAL '24 hours' GROUP BY event_type",
            calls: 16,
            meanMs: 11.2,
            totalMs: 179.2,
            rows: 96,
          },
        ],
        behavior24h: [
          { eventType: "place_view", count: 142 },
          { eventType: "search_query", count: 68 },
          { eventType: "place_save", count: 31 },
          { eventType: "review_create", count: 14 },
        ],
        summary: { errorCount: 0, slowCount: 2 },
        events: filteredEvents,
      }
    },
  },
]
