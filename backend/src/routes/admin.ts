import { Hono } from "hono"
import {
  updateAdminPlaceInputSchema,
  updateAdminReportInputSchema,
  updateAdminUserInputSchema,
  type AdminOverview,
  type AdminPlace,
  type AdminReport,
  type AdminReportStatus,
  type AdminUser,
  type AuditLogEntry,
  type PlaceStatus,
  type UserRole,
} from "@rendez/schema"
import type {
  PlaceCategory as PrismaPlaceCategory,
  PlaceStatus as PrismaPlaceStatus,
  UserRole as PrismaUserRole,
} from "../../generated/prisma/client"
import { Prisma } from "../../generated/prisma/client"
import type { AppEnv } from "../app"
import { recordAuditLog } from "../lib/audit-log"
import { SLUG_ID_RE, UUID_ID_RE, decodeCursor, encodeCursor, requireUuid } from "../lib/cursor"
import { toApiCategory, toApiReportReason, toPrismaCategory } from "../lib/enums"
import { ApiError } from "../lib/errors"
import { metricsSnapshot } from "../lib/metrics"
import { listObservabilityEvents } from "../lib/observability-store"
import { prisma } from "../lib/prisma"
import { clientIp } from "../lib/rate-limit"
import { requireAuth, requireRole } from "../lib/session"
import { invalidateSuggestionCache } from "../lib/suggestions"

const ADMIN_PAGE_SIZE = 20

const REPORT_STATUS_FILTERS = new Set(["pending", "reviewed", "dismissed", "all"])
const PLACE_VISIBILITY_FILTERS = new Set(["all", "published", "unpublished", "closed"])
const USER_ROLE_FILTERS = new Set(["all", "user", "moderator", "admin"])
const USER_STATUS_FILTERS = new Set(["all", "active", "banned"])

function reqIp(c: { req: { raw: Request }; env?: { remoteAddress?: string } }): string | null {
  const ip = clientIp(c.req.raw.headers, c.env?.remoteAddress)
  return ip === "unknown" ? null : ip
}

function parseAdminCursor(raw: string | undefined, pattern: RegExp) {
  if (!raw) return null
  const cursor = decodeCursor(raw, pattern)
  if (!cursor) throw new ApiError(400, "Cursor không hợp lệ")
  return cursor
}

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

interface ReportRow {
  id: string
  place_id: string
  place_name: string
  place_published_at: Date | null
  place_status: string
  reporter_name: string
  reporter_handle: string
  reason: string
  detail: string | null
  status: string
  created_at: Date
  updated_at: Date
}

function toAdminReportDto(row: ReportRow): AdminReport {
  return {
    id: row.id,
    placeId: row.place_id,
    placeName: row.place_name,
    placePublished: row.place_published_at !== null,
    placeStatus: row.place_status as PlaceStatus,
    reporterName: row.reporter_name,
    reporterHandle: row.reporter_handle,
    reason: toApiReportReason(row.reason),
    detail: row.detail,
    status: row.status as AdminReportStatus,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

interface PlaceAdminRow {
  id: string
  name: string
  address: string
  district: string | null
  category: string
  price_level: number
  status: string
  lat: number | null
  lng: number | null
  published_at: Date | null
  moderation_status: string | null
  moderation_note: string | null
  moderated_at: Date | null
  review_count: number
  report_count: number
  created_at: Date
}

function toAdminPlaceDto(row: PlaceAdminRow): AdminPlace {
  const level = row.price_level === 2 || row.price_level === 3 ? row.price_level : 1
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    district: row.district,
    category: toApiCategory(row.category),
    priceLevel: level,
    status: row.status as PlaceStatus,
    lat: row.lat,
    lng: row.lng,
    publishedAt: row.published_at ? row.published_at.toISOString() : null,
    moderationStatus: row.moderation_status,
    moderationNote: row.moderation_note,
    moderatedAt: row.moderated_at ? row.moderated_at.toISOString() : null,
    reviewCount: Number(row.review_count),
    reportCount: Number(row.report_count),
    createdAt: row.created_at.toISOString(),
  }
}

interface UserAdminRow {
  id: string
  name: string
  handle: string
  email: string
  email_verified: boolean
  role: string
  banned_at: Date | null
  ban_reason: string | null
  post_count: number
  review_count: number
  created_at: Date
}

function toAdminUserDto(row: UserAdminRow): AdminUser {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    email: row.email,
    emailVerified: row.email_verified,
    role: row.role as UserRole,
    bannedAt: row.banned_at ? row.banned_at.toISOString() : null,
    banReason: row.ban_reason,
    postCount: Number(row.post_count),
    reviewCount: Number(row.review_count),
    createdAt: row.created_at.toISOString(),
  }
}

interface AuditLogRow {
  id: string
  action: string
  entity: string
  entity_id: string | null
  meta: unknown
  ip: string | null
  created_at: Date
  actor_id: string | null
  actor_name: string | null
  actor_handle: string | null
  actor_role: string | null
}

function toAuditLogDto(row: AuditLogRow): AuditLogEntry {
  const meta =
    row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
      ? (row.meta as Record<string, unknown>)
      : {}
  return {
    id: row.id,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    meta,
    ip: row.ip,
    createdAt: row.created_at.toISOString(),
    actor:
      row.actor_id && row.actor_name && row.actor_handle && row.actor_role
        ? {
            id: row.actor_id,
            name: row.actor_name,
            handle: row.actor_handle,
            role: row.actor_role as UserRole,
          }
        : null,
  }
}

export function createAdminRouter() {
  const router = new Hono<AppEnv>()

  router.use("/admin/*", requireAuth)
  router.use("/admin", requireAuth)

  router.get("/admin/overview", requireRole("admin", "moderator"), async (c) => {
    const snapshot = metricsSnapshot()
    const [venueRows, reportRows, userRows, activityRows] = await Promise.all([
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
    }

    return c.json(overview)
  })

  router.get("/admin/reports", requireRole("admin", "moderator"), async (c) => {
    const rawStatus = c.req.query("status") ?? "pending"
    const status = REPORT_STATUS_FILTERS.has(rawStatus) ? rawStatus : "pending"
    const cursor = parseAdminCursor(c.req.query("cursor"), UUID_ID_RE)

    const conditions: Prisma.Sql[] = [Prisma.sql`p.deleted_at IS NULL`]
    if (status !== "all") {
      conditions.push(Prisma.sql`pr.status = ${status}::report_status`)
    }
    if (cursor) {
      conditions.push(
        Prisma.sql`(pr.created_at, pr.id) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`,
      )
    }

    const rows = await prisma.$queryRaw<ReportRow[]>(Prisma.sql`
      SELECT pr.id, pr.place_id, p.name AS place_name, p.published_at AS place_published_at,
             p.status::text AS place_status, u.name AS reporter_name, u.handle AS reporter_handle,
             pr.reason::text AS reason, pr.detail, pr.status::text AS status,
             pr.created_at, pr.updated_at
      FROM place_reports pr
      JOIN places p ON p.id = pr.place_id
      JOIN users u ON u.id = pr.reporter_id
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY pr.created_at DESC, pr.id DESC
      LIMIT ${ADMIN_PAGE_SIZE + 1}
    `)

    const page = rows.slice(0, ADMIN_PAGE_SIZE)
    const last = page.at(-1)
    const next =
      rows.length > ADMIN_PAGE_SIZE && last
        ? encodeCursor({ createdAt: last.created_at, id: last.id })
        : null

    return c.json({ items: page.map(toAdminReportDto), next })
  })

  router.patch("/admin/reports/:id", requireRole("admin", "moderator"), async (c) => {
    const id = requireUuid(c.req.param("id"), "Không tìm thấy báo cáo")
    const raw = await c.req.json().catch(() => null)
    const parsed = updateAdminReportInputSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
    }

    const actorId = c.get("userId")
    const ip = reqIp(c)
    const { status, placeAction, moderationNote } = parsed.data

    const updatedReport = await prisma.$transaction(async (tx) => {
      const existing = await tx.placeReport.findUnique({
        where: { id },
        include: {
          place: {
            select: { id: true, name: true, publishedAt: true, status: true, deletedAt: true },
          },
          reporter: { select: { name: true, handle: true } },
        },
      })
      if (!existing || existing.place.deletedAt) {
        throw new ApiError(404, "Không tìm thấy báo cáo")
      }

      const now = new Date()
      const updated = await tx.placeReport.update({
        where: { id },
        data: { status },
      })

      let nextPublishedAt = existing.place.publishedAt
      let nextPlaceStatus = existing.place.status
      if (placeAction === "unpublish") {
        nextPublishedAt = null
      } else if (placeAction === "close") {
        nextPlaceStatus = "closed"
      }

      if (placeAction !== "none" || moderationNote !== undefined) {
        await tx.place.update({
          where: { id: existing.placeId },
          data: {
            ...(placeAction === "unpublish" ? { publishedAt: null } : {}),
            ...(placeAction === "close" ? { status: "closed" as PrismaPlaceStatus } : {}),
            moderationStatus: placeAction !== "none" ? placeAction : "report_reviewed",
            moderatedBy: actorId,
            moderatedAt: now,
            ...(moderationNote !== undefined ? { moderationNote: moderationNote || null } : {}),
          },
        })
      }

      await recordAuditLog(
        {
          actorId,
          action: "report.resolve",
          entity: "place_report",
          entityId: id,
          meta: {
            placeId: existing.placeId,
            placeName: existing.place.name,
            previousStatus: existing.status,
            nextStatus: status,
            placeAction,
            note: moderationNote ?? null,
          },
          ip,
        },
        tx,
      )

      return toAdminReportDto({
        id: updated.id,
        place_id: updated.placeId,
        place_name: existing.place.name,
        place_published_at: nextPublishedAt,
        place_status: nextPlaceStatus,
        reporter_name: existing.reporter.name,
        reporter_handle: existing.reporter.handle,
        reason: updated.reason,
        detail: updated.detail,
        status: updated.status,
        created_at: updated.createdAt,
        updated_at: updated.updatedAt,
      })
    })

    if (placeAction !== "none") invalidateSuggestionCache()
    return c.json(updatedReport)
  })

  router.get("/admin/places", requireRole("admin", "moderator"), async (c) => {
    const rawVisibility = c.req.query("visibility") ?? "all"
    const visibility = PLACE_VISIBILITY_FILTERS.has(rawVisibility) ? rawVisibility : "all"
    const district = c.req.query("district")?.trim()
    const rawQ = c.req.query("q")?.trim()
    const cursor = parseAdminCursor(c.req.query("cursor"), SLUG_ID_RE)

    const conditions: Prisma.Sql[] = [Prisma.sql`p.deleted_at IS NULL`]
    if (visibility === "published") {
      conditions.push(Prisma.sql`p.published_at IS NOT NULL AND p.status <> 'closed'`)
    } else if (visibility === "unpublished") {
      conditions.push(Prisma.sql`p.published_at IS NULL`)
    } else if (visibility === "closed") {
      conditions.push(Prisma.sql`p.status = 'closed'`)
    }
    if (district && district !== "all") {
      conditions.push(Prisma.sql`p.district = ${district}`)
    }
    if (rawQ && rawQ.length > 0) {
      const q = rawQ.slice(0, 100)
      conditions.push(
        Prisma.sql`immutable_search_normalize(p.name || ' ' || p.address || ' ' || coalesce(p.district, '')) LIKE '%' || immutable_search_normalize(${q}) || '%'`,
      )
    }
    if (cursor) {
      conditions.push(
        Prisma.sql`(p.created_at, p.id) < (${cursor.createdAt}::timestamptz, ${cursor.id})`,
      )
    }

    const rows = await prisma.$queryRaw<PlaceAdminRow[]>(Prisma.sql`
      SELECT p.id, p.name, p.address, p.district, p.category::text AS category,
             p.price_level, p.status::text AS status, p.lat, p.lng,
             p.published_at, p.moderation_status, p.moderation_note, p.moderated_at,
             p.created_at,
             COALESCE(rv.review_count, 0)::int AS review_count,
             COALESCE(rp.report_count, 0)::int AS report_count
      FROM places p
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS review_count FROM reviews r WHERE r.place_id = p.id AND r.deleted_at IS NULL
      ) rv ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS report_count FROM place_reports pr WHERE pr.place_id = p.id
      ) rp ON true
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ${ADMIN_PAGE_SIZE + 1}
    `)

    const page = rows.slice(0, ADMIN_PAGE_SIZE)
    const last = page.at(-1)
    const next =
      rows.length > ADMIN_PAGE_SIZE && last
        ? encodeCursor({ createdAt: last.created_at, id: last.id })
        : null

    return c.json({ items: page.map(toAdminPlaceDto), next })
  })

  router.patch("/admin/places/:id", requireRole("admin", "moderator"), async (c) => {
    const id = c.req.param("id")
    if (!SLUG_ID_RE.test(id)) throw new ApiError(404, "Không tìm thấy địa điểm")

    const raw = await c.req.json().catch(() => null)
    const parsed = updateAdminPlaceInputSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
    }

    const actorId = c.get("userId")
    const ip = reqIp(c)
    const input = parsed.data

    const updatedDto = await prisma.$transaction(async (tx) => {
      const existing = await tx.place.findFirst({
        where: { id, deletedAt: null },
      })
      if (!existing) throw new ApiError(404, "Không tìm thấy địa điểm")

      const now = new Date()
      const data: Prisma.PlaceUpdateInput = {
        moderatedBy: actorId,
        moderatedAt: now,
        moderationStatus: "edited",
      }
      const changes: Record<string, unknown> = {}

      if (input.published !== undefined) {
        const nextPublishedAt = input.published ? (existing.publishedAt ?? now) : null
        data.publishedAt = nextPublishedAt
        if ((existing.publishedAt !== null) !== input.published) {
          changes.published = input.published
        }
      }
      if (input.status !== undefined && input.status !== existing.status) {
        data.status = input.status as PrismaPlaceStatus
        changes.status = input.status
      }
      if (input.name !== undefined && input.name !== existing.name) {
        data.name = input.name
        changes.name = input.name
      }
      if (input.address !== undefined && input.address !== existing.address) {
        data.address = input.address
        changes.address = input.address
      }
      if (input.district !== undefined && input.district !== existing.district) {
        data.district = input.district || null
        changes.district = input.district || null
      }
      if (input.category !== undefined) {
        const nextCat = toPrismaCategory(input.category) as PrismaPlaceCategory
        if (nextCat !== existing.category) {
          data.category = nextCat
          changes.category = input.category
        }
      }
      if (input.priceLevel !== undefined && input.priceLevel !== existing.priceLevel) {
        data.priceLevel = input.priceLevel
        changes.priceLevel = input.priceLevel
      }
      if (input.lat !== undefined && input.lat !== existing.lat) {
        data.lat = input.lat
        changes.lat = input.lat
      }
      if (input.lng !== undefined && input.lng !== existing.lng) {
        data.lng = input.lng
        changes.lng = input.lng
      }
      if (input.moderationNote !== undefined) {
        data.moderationNote = input.moderationNote || null
        changes.moderationNote = input.moderationNote || null
      }

      const updated = await tx.place.update({ where: { id }, data })
      const counts = await tx.$queryRaw<
        { review_count: number; report_count: number }[]
      >(Prisma.sql`
        SELECT
          (SELECT COUNT(*)::int FROM reviews WHERE place_id = ${id} AND deleted_at IS NULL) AS review_count,
          (SELECT COUNT(*)::int FROM place_reports WHERE place_id = ${id}) AS report_count
      `)

      const nonVisibilityKeys = Object.keys(changes).filter(
        (key) => key !== "published" && key !== "moderationNote",
      )
      const action =
        changes.published !== undefined && nonVisibilityKeys.length === 0
          ? input.published
            ? "place.publish"
            : "place.unpublish"
          : "place.update"

      await recordAuditLog(
        {
          actorId,
          action,
          entity: "place",
          entityId: id,
          meta: { name: updated.name, changes },
          ip,
        },
        tx,
      )

      return toAdminPlaceDto({
        id: updated.id,
        name: updated.name,
        address: updated.address,
        district: updated.district,
        category: updated.category,
        price_level: updated.priceLevel,
        status: updated.status,
        lat: updated.lat,
        lng: updated.lng,
        published_at: updated.publishedAt,
        moderation_status: updated.moderationStatus,
        moderation_note: updated.moderationNote,
        moderated_at: updated.moderatedAt,
        review_count: Number(counts[0]?.review_count ?? 0),
        report_count: Number(counts[0]?.report_count ?? 0),
        created_at: updated.createdAt,
      })
    })

    invalidateSuggestionCache()
    return c.json(updatedDto)
  })

  router.get("/admin/users", requireRole("admin"), async (c) => {
    const rawRole = c.req.query("role") ?? "all"
    const role = USER_ROLE_FILTERS.has(rawRole) ? rawRole : "all"
    const rawStatus = c.req.query("status") ?? "all"
    const status = USER_STATUS_FILTERS.has(rawStatus) ? rawStatus : "all"
    const rawQ = c.req.query("q")?.trim()
    const cursor = parseAdminCursor(c.req.query("cursor"), UUID_ID_RE)

    const conditions: Prisma.Sql[] = [Prisma.sql`u.deleted_at IS NULL`]
    if (role !== "all") {
      conditions.push(Prisma.sql`u.role = ${role}::user_role`)
    }
    if (status === "active") {
      conditions.push(Prisma.sql`u.banned_at IS NULL`)
    } else if (status === "banned") {
      conditions.push(Prisma.sql`u.banned_at IS NOT NULL`)
    }
    if (rawQ && rawQ.length > 0) {
      const q = rawQ.slice(0, 100)
      const likePattern = `%${q}%`
      conditions.push(
        Prisma.sql`(u.name ILIKE ${likePattern} OR u.handle ILIKE ${likePattern} OR u.email ILIKE ${likePattern})`,
      )
    }
    if (cursor) {
      conditions.push(
        Prisma.sql`(u.created_at, u.id) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`,
      )
    }

    const rows = await prisma.$queryRaw<UserAdminRow[]>(Prisma.sql`
      SELECT u.id, u.name, u.handle, u.email, u.email_verified,
             u.role::text AS role, u.banned_at, u.ban_reason, u.created_at,
             COALESCE(p.post_count, 0)::int AS post_count,
             COALESCE(rv.review_count, 0)::int AS review_count
      FROM users u
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS post_count FROM posts ps WHERE ps.author_id = u.id AND ps.deleted_at IS NULL
      ) p ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS review_count FROM reviews r WHERE r.author_id = u.id AND r.deleted_at IS NULL
      ) rv ON true
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT ${ADMIN_PAGE_SIZE + 1}
    `)

    const page = rows.slice(0, ADMIN_PAGE_SIZE)
    const last = page.at(-1)
    const next =
      rows.length > ADMIN_PAGE_SIZE && last
        ? encodeCursor({ createdAt: last.created_at, id: last.id })
        : null

    return c.json({ items: page.map(toAdminUserDto), next })
  })

  router.patch("/admin/users/:id", requireRole("admin"), async (c) => {
    const id = requireUuid(c.req.param("id"), "Không tìm thấy người dùng")
    const raw = await c.req.json().catch(() => null)
    const parsed = updateAdminUserInputSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
    }

    const actorId = c.get("userId")
    const ip = reqIp(c)
    const input = parsed.data

    if (id === actorId && input.banned === true) {
      throw new ApiError(400, "Không thể tự khoá tài khoản của chính mình")
    }
    if (id === actorId && input.role !== undefined && input.role !== "admin") {
      throw new ApiError(400, "Không thể tự hạ quyền của chính mình")
    }

    const updatedDto = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findFirst({
        where: { id, deletedAt: null },
      })
      if (!existing) throw new ApiError(404, "Không tìm thấy người dùng")

      const nextRole = (input.role ?? existing.role) as PrismaUserRole
      const nextBannedAt =
        input.banned === true
          ? (existing.bannedAt ?? new Date())
          : input.banned === false
            ? null
            : existing.bannedAt
      const nextBanReason =
        input.banned === false
          ? null
          : input.banReason !== undefined
            ? input.banReason || null
            : existing.banReason

      const updated = await tx.user.update({
        where: { id },
        data: {
          role: nextRole,
          bannedAt: nextBannedAt,
          banReason: nextBanReason,
        },
      })

      if (input.banned === true) {
        await tx.session.deleteMany({ where: { userId: id } })
      }

      const action =
        input.banned !== undefined ? (input.banned ? "user.ban" : "user.unban") : "user.role_change"

      await recordAuditLog(
        {
          actorId,
          action,
          entity: "user",
          entityId: id,
          meta: {
            handle: existing.handle,
            roleFrom: existing.role,
            roleTo: updated.role,
            banned: updated.bannedAt !== null,
            banReason: updated.banReason,
          },
          ip,
        },
        tx,
      )

      const counts = await tx.$queryRaw<{ post_count: number; review_count: number }[]>(Prisma.sql`
        SELECT
          (SELECT COUNT(*)::int FROM posts WHERE author_id = ${id}::uuid AND deleted_at IS NULL) AS post_count,
          (SELECT COUNT(*)::int FROM reviews WHERE author_id = ${id}::uuid AND deleted_at IS NULL) AS review_count
      `)

      return toAdminUserDto({
        id: updated.id,
        name: updated.name,
        handle: updated.handle,
        email: updated.email,
        email_verified: updated.emailVerified,
        role: updated.role,
        banned_at: updated.bannedAt,
        ban_reason: updated.banReason,
        post_count: Number(counts[0]?.post_count ?? 0),
        review_count: Number(counts[0]?.review_count ?? 0),
        created_at: updated.createdAt,
      })
    })

    return c.json(updatedDto)
  })

  router.get("/admin/audit-logs", requireRole("admin", "moderator"), async (c) => {
    const entity = c.req.query("entity")?.trim()
    const action = c.req.query("action")?.trim()
    const rawQ = c.req.query("q")?.trim()
    const cursor = parseAdminCursor(c.req.query("cursor"), UUID_ID_RE)

    const conditions: Prisma.Sql[] = [Prisma.sql`TRUE`]
    if (entity && entity !== "all") {
      conditions.push(Prisma.sql`al.entity = ${entity}`)
    }
    if (action && action !== "all") {
      conditions.push(Prisma.sql`al.action = ${action}`)
    }
    if (rawQ && rawQ.length > 0) {
      const likePattern = `%${rawQ.slice(0, 100)}%`
      conditions.push(
        Prisma.sql`(al.action ILIKE ${likePattern} OR coalesce(al.entity_id, '') ILIKE ${likePattern} OR coalesce(u.handle, '') ILIKE ${likePattern} OR coalesce(u.name, '') ILIKE ${likePattern})`,
      )
    }
    if (cursor) {
      conditions.push(
        Prisma.sql`(al.created_at, al.id) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`,
      )
    }

    const rows = await prisma.$queryRaw<AuditLogRow[]>(Prisma.sql`
      SELECT al.id, al.action, al.entity, al.entity_id, al.meta, al.ip, al.created_at,
             u.id AS actor_id, u.name AS actor_name, u.handle AS actor_handle, u.role::text AS actor_role
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.actor_id
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY al.created_at DESC, al.id DESC
      LIMIT ${ADMIN_PAGE_SIZE + 1}
    `)

    const page = rows.slice(0, ADMIN_PAGE_SIZE)
    const last = page.at(-1)
    const next =
      rows.length > ADMIN_PAGE_SIZE && last
        ? encodeCursor({ createdAt: last.created_at, id: last.id })
        : null

    return c.json({ items: page.map(toAuditLogDto), next })
  })

  router.get("/admin/observability", requireRole("admin"), async (c) => {
    const kindFilter = c.req.query("kind")?.trim() ?? "all"
    const searchQ = c.req.query("q")?.trim().toLowerCase() ?? ""

    const [snapshot, allEvents, behaviorRows, slowSqlRows] = await Promise.all([
      Promise.resolve(metricsSnapshot()),
      listObservabilityEvents(300),
      prisma.$queryRaw<{ event_type: string; total: number }[]>(Prisma.sql`
        SELECT event_type, COUNT(*)::int AS total
        FROM interaction_events
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY event_type
        ORDER BY total DESC
        LIMIT 12
      `),
      prisma
        .$queryRaw<
          { query: string; calls: number; mean_ms: number; total_ms: number; rows: number }[]
        >(
          Prisma.sql`
            SELECT LEFT(query, 240) AS query,
                   calls::int AS calls,
                   ROUND(mean_exec_time::numeric, 2)::float8 AS mean_ms,
                   ROUND(total_exec_time::numeric, 1)::float8 AS total_ms,
                   rows::int AS rows
            FROM pg_stat_statements
            WHERE query NOT ILIKE '%pg_stat_statements%'
            ORDER BY mean_exec_time DESC
            LIMIT 10
          `,
        )
        .catch(() => []),
    ])

    let errorCount = 0
    let slowCount = 0
    const vitalsMap = new Map<
      "LCP" | "INP" | "CLS",
      { values: number[]; poor: number; good: number }
    >()
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

    const webVitals = (["LCP", "INP", "CLS"] as const).map((name) => {
      const entry = vitalsMap.get(name)
      if (!entry || entry.values.length === 0) {
        return { name, p75: null, samples: 0, poor: 0, good: 0 }
      }
      const sorted = [...entry.values].sort((a, b) => a - b)
      const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(0.75 * sorted.length) - 1))
      return {
        name,
        p75: Number((sorted[idx] ?? 0).toFixed(name === "CLS" ? 3 : 0)),
        samples: entry.values.length,
        poor: entry.poor,
        good: entry.good,
      }
    })

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
      .slice(0, 100)

    return c.json({
      latency: {
        uptimeMs: snapshot.uptimeMs,
        totalQueries: snapshot.totalQueries,
        avgLatencyMs: snapshot.avgLatencyMs,
        p50LatencyMs: snapshot.p50LatencyMs,
        p95LatencyMs: snapshot.p95LatencyMs,
        p99LatencyMs: snapshot.p99LatencyMs,
        cacheHitRatio: snapshot.cacheHitRatio,
        byEndpoint: snapshot.byEndpoint.slice(0, 15),
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

  return router
}
