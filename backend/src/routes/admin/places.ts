import { updateAdminPlaceInputSchema, type PlaceCategory } from "@rendez/schema"
import type { Hono } from "hono"
import type {
  PlaceCategory as PrismaPlaceCategory,
  PlaceStatus as PrismaPlaceStatus,
} from "../../../generated/prisma/client"
import { Prisma } from "../../../generated/prisma/client"
import type { AppEnv } from "../../app"
import { recordAuditLog } from "../../lib/audit-log"
import { SLUG_ID_RE, encodeCursor } from "../../lib/cursor"
import { toPrismaCategory } from "../../lib/enums"
import { ApiError } from "../../lib/errors"
import { prisma } from "../../lib/prisma"
import { requireRole } from "../../lib/session"
import { invalidateSuggestionCache } from "../../lib/suggestions"
import { invalidatePlacesReadCaches } from "../places"
import {
  ADMIN_CONSTANTS,
  PLACE_CATEGORY_FILTERS,
  PLACE_VISIBILITY_FILTERS,
  parseAdminCursor,
  reqIp,
  toAdminPlaceDto,
  type PlaceAdminRow,
} from "./shared"

export function registerAdminPlaceRoutes(router: Hono<AppEnv>): void {
  router.get("/admin/places", requireRole("admin", "moderator"), async (c) => {
    const rawVisibility = c.req.query("visibility") ?? "all"
    const visibility = PLACE_VISIBILITY_FILTERS.has(rawVisibility) ? rawVisibility : "all"
    const district = c.req.query("district")?.trim()
    const rawCategory = c.req.query("category")?.trim()
    const category =
      rawCategory && PLACE_CATEGORY_FILTERS.has(rawCategory as PlaceCategory)
        ? (rawCategory as PlaceCategory)
        : null
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
    if (category) {
      const prismaCategory = toPrismaCategory(category)
      conditions.push(Prisma.sql`p.category = ${prismaCategory}::place_category`)
    }
    if (rawQ && rawQ.length > 0) {
      const q = rawQ.slice(0, ADMIN_CONSTANTS.SEARCH_QUERY_MAX_LEN)
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
      LIMIT ${ADMIN_CONSTANTS.PAGE_SIZE + 1}
    `)

    const page = rows.slice(0, ADMIN_CONSTANTS.PAGE_SIZE)
    const last = page.at(-1)
    const next =
      rows.length > ADMIN_CONSTANTS.PAGE_SIZE && last
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
      const existing = await tx.place.findFirst({ where: { id, deletedAt: null } })
      if (!existing) throw new ApiError(404, "Không tìm thấy địa điểm")

      const now = new Date()
      const data: Prisma.PlaceUpdateInput = {
        moderatedBy: actorId,
        moderatedAt: now,
        moderationStatus: "edited",
      }
      const changes: Record<string, unknown> = {}

      if (input.published !== undefined) {
        data.publishedAt = input.published ? (existing.publishedAt ?? now) : null
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

      const updated = await tx.place.update({
        where: { id },
        data,
        include: {
          _count: {
            select: {
              reviews: { where: { deletedAt: null } },
              reports: true,
            },
          },
        },
      })

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
        review_count: updated._count.reviews,
        report_count: updated._count.reports,
        created_at: updated.createdAt,
      })
    })

    invalidateSuggestionCache()
    invalidatePlacesReadCaches()
    return c.json(updatedDto)
  })
}
