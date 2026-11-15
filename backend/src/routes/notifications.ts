import { Hono } from "hono"
import { streamSSE } from "hono/streaming"
import type { AppEnv } from "../app"
import { UUID_ID_RE, decodeCursor, encodeCursor, requireUuid } from "../lib/cursor"
import { ApiError } from "../lib/errors"
import { prisma } from "../lib/prisma"
import { findNotificationById, listAllNotifications, listNotifications } from "../lib/notifications"
import { requireAuth } from "../lib/session"
import { noStore } from "../lib/http-cache"
import { notificationVersion, subscribeNotifications } from "../lib/notification-events"

const NOTIFICATIONS_PAGE_SIZE = 20

const SSE_HEARTBEAT_MS = 15_000

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
    requireUuid(id, "Không tìm thấy thông báo")

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

  router.get("/notifications/events", requireAuth, (c) => {
    const userId = c.get("userId")

    return streamSSE(c, async (stream) => {
      let unsubscribe = () => {}
      const closed = new Promise<void>((resolve) => {
        unsubscribe = subscribeNotifications(userId, (event) => {
          // Ghi lỗi chỉ xảy ra khi client đã ngắt — `onAbort` đã dọn subscriber.
          void stream
            .writeSSE({ event: "notification-created", data: JSON.stringify(event) })
            .catch(() => {})
        })
        stream.onAbort(() => {
          unsubscribe()
          resolve()
        })
      })

      // Subscribe TRƯỚC khi đọc version để không mất update giữa hai bước.
      await stream.writeSSE({
        event: "notification-created",
        data: JSON.stringify({ version: notificationVersion(userId) }),
      })

      const heartbeat = setInterval(() => {
        void stream.writeSSE({ event: "ping", data: "{}" }).catch(() => {})
      }, SSE_HEARTBEAT_MS)

      await closed
      clearInterval(heartbeat)
    })
  })

  return router
}
