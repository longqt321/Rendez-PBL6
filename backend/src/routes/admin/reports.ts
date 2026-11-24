import { updateAdminReportInputSchema } from "@rendez/schema"
import type { Hono } from "hono"
import type {
  PlaceStatus as PrismaPlaceStatus,
  Prisma,
  ReportStatus as PrismaReportStatus,
} from "../../../generated/prisma/client"
import type { AppEnv } from "../../app"
import { recordAuditLog } from "../../lib/audit-log"
import { UUID_ID_RE, encodeCursor, requireUuid } from "../../lib/cursor"
import { ApiError } from "../../lib/errors"
import { prisma } from "../../lib/prisma"
import { requireRole } from "../../lib/session"
import { invalidateSuggestionCache } from "../../lib/suggestions"
import { invalidatePlacesReadCaches } from "../places"
import { createSystemNotification } from "../../lib/notifications"
import {
  ADMIN_CONSTANTS,
  REPORT_STATUS_FILTERS,
  parseAdminCursor,
  reqIp,
  toAdminReportDto,
} from "./shared"

export function registerAdminReportRoutes(router: Hono<AppEnv>): void {
  router.get("/admin/reports", requireRole("admin", "moderator"), async (c) => {
    const rawStatus = c.req.query("status") ?? "pending"
    const status = REPORT_STATUS_FILTERS.has(rawStatus) ? rawStatus : "pending"
    const cursor = parseAdminCursor(c.req.query("cursor"), UUID_ID_RE)

    const where: Prisma.PlaceReportWhereInput = {
      place: { deletedAt: null },
      ...(status !== "all" ? { status: status as PrismaReportStatus } : {}),
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    }

    const rows = await prisma.placeReport.findMany({
      where,
      include: {
        place: { select: { name: true, publishedAt: true, status: true } },
        reporter: { select: { name: true, handle: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: ADMIN_CONSTANTS.PAGE_SIZE + 1,
    })

    const page = rows.slice(0, ADMIN_CONSTANTS.PAGE_SIZE)
    const last = page.at(-1)
    const next =
      rows.length > ADMIN_CONSTANTS.PAGE_SIZE && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null

    return c.json({
      items: page.map((row) =>
        toAdminReportDto({
          id: row.id,
          place_id: row.placeId,
          place_name: row.place.name,
          place_published_at: row.place.publishedAt,
          place_status: row.place.status,
          reporter_name: row.reporter.name,
          reporter_handle: row.reporter.handle,
          reason: row.reason,
          detail: row.detail,
          status: row.status,
          created_at: row.createdAt,
          updated_at: row.updatedAt,
        }),
      ),
      next,
    })
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

      return {
        dto: toAdminReportDto({
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
        }),
        reporterId: existing.reporterId,
        placeName: existing.place.name,
      }
    })

    if (placeAction !== "none") {
      invalidateSuggestionCache()
      invalidatePlacesReadCaches()
    }

    if (status === "reviewed" && updatedReport) {
      void createSystemNotification({
        userId: updatedReport.reporterId,
        title: "Báo cáo địa điểm đã được xử lý",
        body: `Cảm ơn bạn! Báo cáo về quán “${updatedReport.placeName}” đã được ban quản trị xem xét và cập nhật thông tin.`,
      }).catch(() => {})
    }

    return c.json(updatedReport.dto)
  })
}
