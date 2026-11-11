import { Hono } from "hono"
import type { AppEnv } from "../app"
import { UUID_ID_RE, decodeCursor, encodeCursor } from "../lib/cursor"
import { ApiError } from "../lib/errors"
import { prisma } from "../lib/prisma"
import { listNotifications, toNotificationDto, type NotificationRow } from "../lib/notifications"
import { requireAuth } from "../lib/session"

/**
 * Route thông báo (T4.5) — `GET /notifications`, `PATCH /notifications`
 * (đánh dấu tất cả đã đọc), `PATCH /notifications/:id`.
 */

const NOTIFICATIONS_PAGE_SIZE = 20
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function createNotificationsRouter() {
  const router = new Hono<AppEnv>()

  router.get("/notifications", requireAuth, async (c) => {
    const rawCursor = c.req.query("cursor")
    const cursor = rawCursor ? decodeCursor(rawCursor, UUID_ID_RE) : null
    if (rawCursor && !cursor) throw new ApiError(400, "Cursor không hợp lệ")

    const page = await listNotifications(c.get("userId"), cursor, NOTIFICATIONS_PAGE_SIZE)
    return c.json({
      items: page.items,
      next: page.next ? encodeCursor(page.next) : null,
    })
  })

  /** Đánh dấu tất cả đã đọc — trả danh sách sau cập nhật (khớp mock). */
  router.patch("/notifications", requireAuth, async (c) => {
    const userId = c.get("userId")
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    })

    const rows = await prisma.$queryRaw<NotificationRow[]>`
      SELECT n.id, n.type::text AS type, n.payload, n.read_at, n.created_at,
             p.place_id AS post_place_id
      FROM notifications n
      LEFT JOIN posts p ON p.id = NULLIF(n.payload->>'postId', '')::uuid
      WHERE n.user_id = ${userId}::uuid
      ORDER BY n.created_at DESC, n.id DESC
    `
    return c.json(rows.map(toNotificationDto))
  })

  router.patch("/notifications/:id", requireAuth, async (c) => {
    const id = c.req.param("id")
    if (!UUID_RE.test(id)) throw new ApiError(404, "Không tìm thấy thông báo")

    const userId = c.get("userId")
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
      select: { id: true },
    })
    if (!notification) throw new ApiError(404, "Không tìm thấy thông báo")

    await prisma.notification.update({ where: { id }, data: { readAt: new Date() } })

    const rows = await prisma.$queryRaw<NotificationRow[]>`
      SELECT n.id, n.type::text AS type, n.payload, n.read_at, n.created_at,
             p.place_id AS post_place_id
      FROM notifications n
      LEFT JOIN posts p ON p.id = NULLIF(n.payload->>'postId', '')::uuid
      WHERE n.id = ${id}::uuid
      LIMIT 1
    `
    const row = rows[0]
    if (!row) throw new ApiError(404, "Không tìm thấy thông báo")
    return c.json(toNotificationDto(row))
  })

  return router
}
