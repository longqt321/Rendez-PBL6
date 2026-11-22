import { updateAdminReportInputSchema } from "@rendez/schema"
import type { Hono } from "hono"
import type { PlaceStatus as PrismaPlaceStatus } from "../../../generated/prisma/client"
import { Prisma } from "../../../generated/prisma/client"
import type { AppEnv } from "../../app"
import { recordAuditLog } from "../../lib/audit-log"
import { UUID_ID_RE, encodeCursor, requireUuid } from "../../lib/cursor"
import { ApiError } from "../../lib/errors"
import { prisma } from "../../lib/prisma"
import { requireRole } from "../../lib/session"
import { invalidateSuggestionCache } from "../../lib/suggestions"
import { invalidatePlacesReadCaches } from "../places"
import {
  ADMIN_CONSTANTS,
  REPORT_STATUS_FILTERS,
  parseAdminCursor,
  reqIp,
  toAdminReportDto,
  type ReportRow,
} from "./shared"

export function registerAdminReportRoutes(router: Hono<AppEnv>): void {
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
      LIMIT ${ADMIN_CONSTANTS.PAGE_SIZE + 1}
    `)

    const page = rows.slice(0, ADMIN_CONSTANTS.PAGE_SIZE)
    const last = page.at(-1)
    const next =
      rows.length > ADMIN_CONSTANTS.PAGE_SIZE && last
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

    if (placeAction !== "none") {
      invalidateSuggestionCache()
      invalidatePlacesReadCaches()
    }
    return c.json(updatedReport)
  })
}
