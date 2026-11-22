import type { Hono } from "hono"
import type { Prisma } from "../../../generated/prisma/client"
import type { AppEnv } from "../../app"
import { shouldMaskAdminPii } from "../../lib/admin-privacy"
import { UUID_ID_RE, encodeCursor } from "../../lib/cursor"
import { prisma } from "../../lib/prisma"
import { requireRole } from "../../lib/session"
import { ADMIN_CONSTANTS, parseAdminCursor, toAuditLogDto } from "./shared"

export function registerAdminAuditLogRoutes(router: Hono<AppEnv>): void {
  router.get("/admin/audit-logs", requireRole("admin", "moderator"), async (c) => {
    const entity = c.req.query("entity")?.trim()
    const action = c.req.query("action")?.trim()
    const rawQ = c.req.query("q")?.trim()
    const cursor = parseAdminCursor(c.req.query("cursor"), UUID_ID_RE)

    const andFilters: Prisma.AuditLogWhereInput[] = []
    if (entity && entity !== "all") {
      andFilters.push({ entity })
    }
    if (action && action !== "all") {
      andFilters.push({ action })
    }
    if (rawQ && rawQ.length > 0) {
      const q = rawQ.slice(0, ADMIN_CONSTANTS.SEARCH_QUERY_MAX_LEN)
      andFilters.push({
        OR: [
          { action: { contains: q, mode: "insensitive" } },
          { entityId: { contains: q, mode: "insensitive" } },
          { actor: { handle: { contains: q, mode: "insensitive" } } },
          { actor: { name: { contains: q, mode: "insensitive" } } },
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

    const rows = await prisma.auditLog.findMany({
      where: andFilters.length > 0 ? { AND: andFilters } : undefined,
      include: {
        actor: { select: { id: true, name: true, handle: true, role: true } },
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
        toAuditLogDto(
          {
            id: row.id,
            action: row.action,
            entity: row.entity,
            entity_id: row.entityId,
            meta: row.meta,
            ip: row.ip,
            created_at: row.createdAt,
            actor_id: row.actor?.id ?? null,
            actor_name: row.actor?.name ?? null,
            actor_handle: row.actor?.handle ?? null,
            actor_role: row.actor?.role ?? null,
          },
          maskPii,
        ),
      ),
      next,
    })
  })
}
