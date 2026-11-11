import { Hono } from "hono"
import type { AppEnv } from "../app"
import { UUID_ID_RE, decodeCursor, encodeCursor } from "../lib/cursor"
import { ApiError } from "../lib/errors"
import { prisma } from "../lib/prisma"
import { findNotificationById, listAllNotifications, listNotifications } from "../lib/notifications"
import { requireAuth } from "../lib/session"
import { noStore } from "../lib/http-cache"

/**
 * Route thông báo (T4.5) — `GET /notifications`, `PATCH /notifications`
 * (đánh dấu tất cả đã đọc), `PATCH /notifications/:id`.
 *
 * Truy vấn nằm ở `lib/notifications.ts` (một nơi dựng DTO + SELECT) — route chỉ
 * kiểm quyền và gọi lib, không tự viết lại SQL.
 */

const NOTIFICATIONS_PAGE_SIZE = 20

export function createNotificationsRouter() {
  const router = new Hono<AppEnv>()

  router.get("/notifications", requireAuth, async (c) => {
    const rawCursor = c.req.query("cursor")
    const cursor = rawCursor ? decodeCursor(rawCursor, UUID_ID_RE) : null
    if (rawCursor && !cursor) throw new ApiError(400, "Cursor không hợp lệ")

    const page = await listNotifications(c.get("userId"), cursor, NOTIFICATIONS_PAGE_SIZE)
    return noStore(c, {
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

    return noStore(c, await listAllNotifications(userId))
  })

  router.patch("/notifications/:id", requireAuth, async (c) => {
    const id = c.req.param("id")
    if (!UUID_ID_RE.test(id)) throw new ApiError(404, "Không tìm thấy thông báo")

    const userId = c.get("userId")
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
      select: { id: true },
    })
    if (!notification) throw new ApiError(404, "Không tìm thấy thông báo")

    await prisma.notification.update({ where: { id }, data: { readAt: new Date() } })

    const updated = await findNotificationById(id)
    if (!updated) throw new ApiError(404, "Không tìm thấy thông báo")
    return c.json(updated)
  })

  return router
}
