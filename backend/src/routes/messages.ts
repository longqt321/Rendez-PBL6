import { Hono } from "hono"
import {
  sendDirectMessageInputSchema,
  type ConversationSummary,
  type DirectMessage,
  type DirectMessagePeer,
} from "@rendez/schema"
import type { AppEnv } from "../app"
import { ApiError } from "../lib/errors"
import { prisma } from "../lib/prisma"
import { formatInitials } from "../lib/profile"
import { rateLimit } from "../lib/rate-limit"
import { requireAuth } from "../lib/session"

const MESSAGE_RATE_LIMIT = rateLimit({
  scope: "dm-send",
  limit: 30,
  windowSeconds: 60,
  byUser: true,
})

function toPeerDto(user: {
  id: string
  name: string
  handle: string
  avatarUrl: string | null
}): DirectMessagePeer {
  return {
    id: user.id,
    name: user.name,
    handle: user.handle,
    initials: formatInitials(user.name),
    avatarUrl: user.avatarUrl,
  }
}

function toMessageDto(row: {
  id: string
  senderId: string
  recipientId: string
  body: string
  readAt: Date | null
  createdAt: Date
}): DirectMessage {
  return {
    id: row.id,
    senderId: row.senderId,
    recipientId: row.recipientId,
    body: row.body,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }
}

async function resolvePeerByHandle(handle: string, viewerId: string) {
  const peer = await prisma.user.findFirst({
    where: { handle, deletedAt: null, bannedAt: null },
    select: { id: true, name: true, handle: true, avatarUrl: true },
  })
  if (!peer) throw new ApiError(404, "Không tìm thấy người dùng")
  if (peer.id === viewerId) throw new ApiError(400, "Không thể nhắn tin cho chính mình")
  return peer
}

export function createMessagesRouter() {
  const router = new Hono<AppEnv>()

  /** Danh sách cuộc trò chuyện của người dùng hiện tại, mới nhất lên đầu. */
  router.get("/messages/conversations", requireAuth, async (c) => {
    const userId = c.get("userId")
    const rows = await prisma.directMessage.findMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        sender: {
          select: { id: true, name: true, handle: true, avatarUrl: true, deletedAt: true },
        },
        recipient: {
          select: { id: true, name: true, handle: true, avatarUrl: true, deletedAt: true },
        },
      },
    })

    const byPeer = new Map<string, ConversationSummary>()
    for (const row of rows) {
      const isOutgoing = row.senderId === userId
      const peer = isOutgoing ? row.recipient : row.sender
      if (peer.deletedAt) continue

      const existing = byPeer.get(peer.id)
      const isUnreadIncoming = !isOutgoing && row.readAt === null
      if (!existing) {
        byPeer.set(peer.id, {
          peer: toPeerDto(peer),
          lastMessage: toMessageDto(row),
          unreadCount: isUnreadIncoming ? 1 : 0,
        })
      } else if (isUnreadIncoming) {
        existing.unreadCount += 1
      }
    }

    return c.json({ items: Array.from(byPeer.values()) })
  })

  /** Lịch sử tin nhắn với một người dùng (đồng thời đánh dấu đã đọc tin nhắn đến). */
  router.get("/messages/with/:handle", requireAuth, async (c) => {
    const userId = c.get("userId")
    const peer = await resolvePeerByHandle(c.req.param("handle"), userId)

    await prisma.directMessage.updateMany({
      where: { senderId: peer.id, recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    })

    const rows = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: peer.id },
          { senderId: peer.id, recipientId: userId },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    })

    return c.json({
      peer: toPeerDto(peer),
      items: rows.map(toMessageDto),
    })
  })

  /** Gửi tin nhắn trực tiếp mới tới `@handle`. */
  router.post("/messages/with/:handle", requireAuth, MESSAGE_RATE_LIMIT, async (c) => {
    const userId = c.get("userId")
    const peer = await resolvePeerByHandle(c.req.param("handle"), userId)

    const raw = await c.req.json().catch(() => null)
    const parsed = sendDirectMessageInputSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Tin nhắn không hợp lệ")
    }

    const created = await prisma.directMessage.create({
      data: {
        senderId: userId,
        recipientId: peer.id,
        body: parsed.data.body,
      },
    })

    return c.json(toMessageDto(created), 201)
  })

  return router
}
