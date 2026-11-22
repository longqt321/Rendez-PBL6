import { updateAdminUserInputSchema } from "@rendez/schema"
import type { Hono } from "hono"
import type { UserRole as PrismaUserRole } from "../../../generated/prisma/client"
import { Prisma } from "../../../generated/prisma/client"
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
  type UserAdminRow,
} from "./shared"

export function registerAdminUserRoutes(router: Hono<AppEnv>): void {
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
      const q = rawQ.slice(0, ADMIN_CONSTANTS.SEARCH_QUERY_MAX_LEN)
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
      LIMIT ${ADMIN_CONSTANTS.PAGE_SIZE + 1}
    `)

    const page = rows.slice(0, ADMIN_CONSTANTS.PAGE_SIZE)
    const last = page.at(-1)
    const next =
      rows.length > ADMIN_CONSTANTS.PAGE_SIZE && last
        ? encodeCursor({ createdAt: last.created_at, id: last.id })
        : null

    const maskPii = shouldMaskAdminPii()
    return c.json({ items: page.map((row) => toAdminUserDto(row, maskPii)), next })
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
          post_count: Number(counts[0]?.post_count ?? 0),
          review_count: Number(counts[0]?.review_count ?? 0),
          created_at: updated.createdAt,
        },
        shouldMaskAdminPii(),
      )
    })

    return c.json(updatedDto)
  })
}
