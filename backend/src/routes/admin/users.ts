import { updateAdminUserInputSchema } from "@rendez/schema"
import type { Hono } from "hono"
import type { Prisma, UserRole as PrismaUserRole } from "../../../generated/prisma/client"
import type { AppEnv } from "../../app"
import { shouldMaskAdminPii } from "../../lib/admin-privacy"
import { recordAuditLog } from "../../lib/audit-log"
import { UUID_ID_RE, encodeCursor, requireUuid } from "../../lib/cursor"
import { ApiError } from "../../lib/errors"
import { prisma } from "../../lib/prisma"
import { requireRole } from "../../lib/session"
import {
  ADMIN_CONSTANTS,
  USER_ROLE_FILTERS,
  USER_STATUS_FILTERS,
  parseAdminCursor,
  reqIp,
  toAdminUserDto,
} from "./shared"

export function registerAdminUserRoutes(router: Hono<AppEnv>): void {
  router.get("/admin/users", requireRole("admin"), async (c) => {
    const rawRole = c.req.query("role") ?? "all"
    const role = USER_ROLE_FILTERS.has(rawRole) ? rawRole : "all"
    const rawStatus = c.req.query("status") ?? "all"
    const status = USER_STATUS_FILTERS.has(rawStatus) ? rawStatus : "all"
    const rawQ = c.req.query("q")?.trim()
    const cursor = parseAdminCursor(c.req.query("cursor"), UUID_ID_RE)

    const andFilters: Prisma.UserWhereInput[] = [{ deletedAt: null }]
    if (role !== "all") {
      andFilters.push({ role: role as PrismaUserRole })
    }
    if (status === "active") {
      andFilters.push({ bannedAt: null })
    } else if (status === "banned") {
      andFilters.push({ bannedAt: { not: null } })
    }
    if (rawQ && rawQ.length > 0) {
      const q = rawQ.slice(0, ADMIN_CONSTANTS.SEARCH_QUERY_MAX_LEN)
      andFilters.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { handle: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      })
    }
    if (cursor) {
      andFilters.push({
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ],
      })
    }

    const rows = await prisma.user.findMany({
      where: { AND: andFilters },
      select: {
        id: true,
        name: true,
        handle: true,
        email: true,
        emailVerified: true,
        role: true,
        bannedAt: true,
        banReason: true,
        createdAt: true,
        _count: {
          select: {
            posts: { where: { deletedAt: null } },
            reviews: { where: { deletedAt: null } },
          },
        },
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

    const maskPii = shouldMaskAdminPii()
    return c.json({
      items: page.map((row) =>
        toAdminUserDto(
          {
            id: row.id,
            name: row.name,
            handle: row.handle,
            email: row.email,
            email_verified: row.emailVerified,
            role: row.role,
            banned_at: row.bannedAt,
            ban_reason: row.banReason,
            post_count: row._count.posts,
            review_count: row._count.reviews,
            created_at: row.createdAt,
          },
          maskPii,
        ),
      ),
      next,
    })
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
      const existing = await tx.user.findFirst({ where: { id, deletedAt: null } })
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
        data: { role: nextRole, bannedAt: nextBannedAt, banReason: nextBanReason },
        select: {
          id: true,
          name: true,
          handle: true,
          email: true,
          emailVerified: true,
          role: true,
          bannedAt: true,
          banReason: true,
          createdAt: true,
          _count: {
            select: {
              posts: { where: { deletedAt: null } },
              reviews: { where: { deletedAt: null } },
            },
          },
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

      return toAdminUserDto(
        {
          id: updated.id,
          name: updated.name,
          handle: updated.handle,
          email: updated.email,
          email_verified: updated.emailVerified,
          role: updated.role,
          banned_at: updated.bannedAt,
          ban_reason: updated.banReason,
          post_count: updated._count.posts,
          review_count: updated._count.reviews,
          created_at: updated.createdAt,
        },
        shouldMaskAdminPii(),
      )
    })

    return c.json(updatedDto)
  })
}
