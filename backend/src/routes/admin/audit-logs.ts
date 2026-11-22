import type { Hono } from "hono"
import { Prisma } from "../../../generated/prisma/client"
import type { AppEnv } from "../../app"
import { shouldMaskAdminPii } from "../../lib/admin-privacy"
import { UUID_ID_RE, encodeCursor } from "../../lib/cursor"
import { prisma } from "../../lib/prisma"
import { requireRole } from "../../lib/session"
import { ADMIN_CONSTANTS, parseAdminCursor, toAuditLogDto, type AuditLogRow } from "./shared"

export function registerAdminAuditLogRoutes(router: Hono<AppEnv>): void {
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
      const likePattern = `%${rawQ.slice(0, ADMIN_CONSTANTS.SEARCH_QUERY_MAX_LEN)}%`
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
      LIMIT ${ADMIN_CONSTANTS.PAGE_SIZE + 1}
    `)

    const page = rows.slice(0, ADMIN_CONSTANTS.PAGE_SIZE)
    const last = page.at(-1)
    const next =
      rows.length > ADMIN_CONSTANTS.PAGE_SIZE && last
        ? encodeCursor({ createdAt: last.created_at, id: last.id })
        : null

    const maskPii = shouldMaskAdminPii()
    return c.json({ items: page.map((row) => toAuditLogDto(row, maskPii)), next })
  })
}
