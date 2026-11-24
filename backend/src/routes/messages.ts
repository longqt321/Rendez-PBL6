import { Hono } from "hono"
import { streamSSE } from "hono/streaming"
import {
  sendDirectMessageInputSchema,
  type ConversationSummary,
  type DirectMessage,
  type DirectMessagePeer,
} from "@rendez/schema"
import { Prisma } from "../../generated/prisma/client"
import type { AppEnv } from "../app"
import { UUID_ID_RE, decodeCursor, encodeCursor } from "../lib/cursor"
import { ApiError } from "../lib/errors"
import { db, sql } from "../lib/kysely"
import { prisma } from "../lib/prisma"
import { formatInitials } from "../lib/profile"
import { rateLimit } from "../lib/rate-limit"
import { requireAuth } from "../lib/session"
import { createDirectMessageNotification } from "../lib/notifications"
import { publishDirectMessage, subscribeDirectMessages } from "../lib/message-events"

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
  attachment?: unknown
  readAt: Date | null
  createdAt: Date
}): DirectMessage {
  return {
    id: row.id,
    senderId: row.senderId,
    recipientId: row.recipientId,
    body: row.body,
    ...(row.attachment && typeof row.attachment === "object"
      ? { attachment: row.attachment as DirectMessage["attachment"] }
      : {}),
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

  const isBlocked = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: viewerId, blockedId: peer.id },
        { blockerId: peer.id, blockedId: viewerId },
      ],
    },
  })
  if (isBlocked) {
    throw new ApiError(403, "Không thể gửi hoặc xem tin nhắn với người dùng này")
  }

  return peer
}

export function createMessagesRouter() {
  const router = new Hono<AppEnv>()

  /** Server-Sent Events stream đẩy tin nhắn thời gian thực */
  router.get("/messages/events", requireAuth, async (c) => {
    const userId = c.get("userId")!
    return streamSSE(c, async (stream) => {
      const unsub = subscribeDirectMessages(userId, (msg) => {
        void stream.writeSSE({
          event: "message",
          data: JSON.stringify(msg),
        })
      })

      stream.onAbort(() => {
        unsub()
      })

      while (!stream.aborted) {
        await stream.sleep(20_000)
        if (!stream.aborted) {
          await stream.writeSSE({ event: "ping", data: "" })
        }
      }
    })
  })

  /** Danh sách cuộc trò chuyện của người dùng hiện tại, mới nhất lên đầu. */
  router.get("/messages/conversations", requireAuth, async (c) => {
    const userId = c.get("userId")
    const folder = c.req.query("folder")
    const peerIdExpr = sql<string>`CASE WHEN dm.sender_id = ${userId}::uuid THEN dm.recipient_id ELSE dm.sender_id END`

    let baseQuery = db
      .with("latest", (qb) =>
        qb
          .selectFrom("direct_messages as dm")
          .distinctOn(peerIdExpr)
          .where((eb) =>
            eb.or([eb("dm.sender_id", "=", userId), eb("dm.recipient_id", "=", userId)]),
          )
          .select([
            "dm.id",
            "dm.sender_id",
            "dm.recipient_id",
            "dm.body",
            "dm.attachment",
            "dm.read_at",
            "dm.created_at",
            peerIdExpr.as("peer_id"),
          ])
          .orderBy(peerIdExpr)
          .orderBy("dm.created_at", "desc")
          .orderBy("dm.id", "desc"),
      )
      .with("unread", (qb) =>
        qb
          .selectFrom("direct_messages")
          .where("recipient_id", "=", userId)
          .where("read_at", "is", null)
          .groupBy("sender_id")
          .select(["sender_id as peer_id", sql<number>`COUNT(*)::int`.as("unread_count")]),
      )
      .selectFrom("latest as l")
      .innerJoin("users as u", "u.id", "l.peer_id")
      .leftJoin("unread as ur", "ur.peer_id", "l.peer_id")
      .where("u.deleted_at", "is", null)
      .where("u.banned_at", "is", null)
      .where(
        sql<boolean>`NOT EXISTS (
          SELECT 1 FROM user_blocks ub
          WHERE (ub.blocker_id = ${userId}::uuid AND ub.blocked_id = l.peer_id)
             OR (ub.blocker_id = l.peer_id AND ub.blocked_id = ${userId}::uuid)
        )`,
      )

    if (folder === "requests") {
      baseQuery = baseQuery.where(
        sql<boolean>`
          l.recipient_id = ${userId}::uuid
          AND NOT EXISTS (
            SELECT 1 FROM direct_messages dm2
            WHERE dm2.sender_id = ${userId}::uuid AND dm2.recipient_id = l.peer_id
          )
          AND NOT EXISTS (
            SELECT 1 FROM follows f
            WHERE f.follower_id = ${userId}::uuid AND f.following_id = l.peer_id
          )
        `,
      )
    } else if (folder === "primary") {
      baseQuery = baseQuery.where(
        sql<boolean>`
          l.sender_id = ${userId}::uuid
          OR EXISTS (
            SELECT 1 FROM direct_messages dm2
            WHERE dm2.sender_id = ${userId}::uuid AND dm2.recipient_id = l.peer_id
          )
          OR EXISTS (
            SELECT 1 FROM follows f
            WHERE f.follower_id = ${userId}::uuid AND f.following_id = l.peer_id
          )
        `,
      )
    }

    const rows = await baseQuery
      .select([
        "l.id",
        "l.sender_id",
        "l.recipient_id",
        "l.body",
        "l.attachment",
        "l.read_at",
        "l.created_at",
        "u.id as peer_id",
        "u.name as peer_name",
        "u.handle as peer_handle",
        "u.avatar_url as peer_avatar_url",
        sql<number>`COALESCE(ur.unread_count, 0)::int`.as("unread_count"),
      ])
      .orderBy("l.created_at", "desc")
      .orderBy("l.id", "desc")
      .limit(100)
      .execute()

    const items: ConversationSummary[] = rows.map((row) => ({
      peer: toPeerDto({
        id: row.peer_id,
        name: row.peer_name,
        handle: row.peer_handle,
        avatarUrl: row.peer_avatar_url,
      }),
      lastMessage: toMessageDto({
        id: row.id,
        senderId: row.sender_id,
        recipientId: row.recipient_id,
        body: row.body,
        attachment: row.attachment,
        readAt: row.read_at,
        createdAt: row.created_at,
      }),
      unreadCount: Number(row.unread_count),
    }))

    return c.json({ items })
  })

  /** Lịch sử tin nhắn với một người dùng (đồng thời đánh dấu đã đọc tin nhắn đến). */
  router.get("/messages/with/:handle", requireAuth, async (c) => {
    const userId = c.get("userId")
    const peer = await resolvePeerByHandle(c.req.param("handle"), userId)
    const rawCursor = c.req.query("cursor")
    const cursor = rawCursor ? decodeCursor(rawCursor, UUID_ID_RE) : null
    if (rawCursor && !cursor) throw new ApiError(400, "Cursor không hợp lệ")

    if (!cursor) {
      await prisma.directMessage.updateMany({
        where: { senderId: peer.id, recipientId: userId, readAt: null },
        data: { readAt: new Date() },
      })
    }

    const pageSize = 100
    const rows = await prisma.directMessage.findMany({
      where: {
        AND: [
          {
            OR: [
              { senderId: userId, recipientId: peer.id },
              { senderId: peer.id, recipientId: userId },
            ],
          },
          ...(cursor
            ? [
                {
                  OR: [
                    { createdAt: { lt: cursor.createdAt } },
                    { createdAt: cursor.createdAt, id: { lt: cursor.id } },
                  ],
                },
              ]
            : []),
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: pageSize + 1,
    })

    const hasMore = rows.length > pageSize
    const pageDesc = rows.slice(0, pageSize)
    const oldest = pageDesc.at(-1)
    const items = pageDesc.reverse().map(toMessageDto)

    return c.json({
      peer: toPeerDto(peer),
      items,
      next: hasMore && oldest ? encodeCursor({ createdAt: oldest.createdAt, id: oldest.id }) : null,
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
        ...(parsed.data.attachment
          ? { attachment: parsed.data.attachment as Prisma.InputJsonValue }
          : {}),
      },
    })

    const dto = toMessageDto(created)
    publishDirectMessage(peer.id, dto)
    publishDirectMessage(userId, dto)

    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, handle: true, avatarUrl: true },
    })
    if (sender) {
      void createDirectMessageNotification({
        userId: peer.id,
        actor: {
          id: userId,
          name: sender.name,
          handle: sender.handle,
          avatarUrl: sender.avatarUrl,
        },
        messageExcerpt: parsed.data.body.slice(0, 100),
      }).catch(() => {})
    }

    return c.json(dto, 201)
  })

  return router
}
