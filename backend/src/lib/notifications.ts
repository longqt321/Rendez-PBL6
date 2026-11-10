import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"
import { toApiNotificationType, toPrismaNotificationType } from "./enums"
import type { Cursor } from "./cursor"
import { formatInitials } from "./profile"

/**
 * Thông báo (A6.4) — payload JSONB theo `kind`, DTO là union 3 nhánh.
 *
 * `postPlaceId` của thông báo `place-suggestion` do server tính từ bài đăng
 * hiện tại (FE không tự tra cứu).
 */

export type NotificationKind = "place-suggestion" | "like" | "comment" | "follow" | "system"

interface ActorPayload {
  actorName: string
  actorInitials: string
  postId?: string
  excerpt?: string
}

interface SuggestionPayload {
  postId: string
  postCaption: string
  suggestions: { place: unknown; reason: string }[]
}

interface SystemPayload {
  title: string
  body: string
}

export interface NotificationRow {
  id: string
  type: string
  payload: unknown
  read_at: Date | null
  created_at: Date
  post_place_id: string | null
}

/**
 * Ghi thông báo cho hành động like/comment/follow.
 *
 * Không tự thông báo cho chính mình (like bài của mình) — mock cũng không sinh.
 */
export async function createActorNotification(params: {
  userId: string
  kind: "like" | "comment" | "follow"
  actor: { id: string; name: string }
  postId?: string
  excerpt?: string
}): Promise<void> {
  if (params.actor.id === params.userId) return

  const payload: Prisma.InputJsonObject = {
    actorName: params.actor.name,
    actorInitials: formatInitials(params.actor.name),
    ...(params.postId ? { postId: params.postId } : {}),
    ...(params.excerpt ? { excerpt: params.excerpt } : {}),
  }

  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: toPrismaNotificationType(params.kind),
      payload: payload as Prisma.InputJsonObject,
    },
  })
}

/**
 * Ghi thông báo đề xuất địa điểm (job T4.4 gọi) — trả id để job ghi dấu
 * idempotence. Nhận `client` tuỳ chọn để chạy trong transaction của caller.
 */
export async function createSuggestionNotification(params: {
  userId: string
  postId: string
  postCaption: string
  suggestions: { place: Prisma.InputJsonObject; reason: string }[]
  client?: Prisma.TransactionClient
}): Promise<string> {
  const payload: Prisma.InputJsonObject = {
    postId: params.postId,
    postCaption: params.postCaption,
    suggestions: params.suggestions,
  }
  const client = params.client ?? prisma
  const created = await client.notification.create({
    data: {
      userId: params.userId,
      type: toPrismaNotificationType("place-suggestion"),
      payload: payload as Prisma.InputJsonObject,
    },
    select: { id: true },
  })
  return created.id
}

/** Chuyển dòng DB thành DTO đúng `notificationSchema`. */
export function toNotificationDto(row: NotificationRow) {
  const base = {
    id: row.id,
    createdAt: row.created_at.toISOString(),
    read: row.read_at !== null,
  }

  const kind = toApiNotificationType(row.type)
  switch (kind) {
    case "place-suggestion": {
      const payload = row.payload as SuggestionPayload
      return {
        ...base,
        kind: "place-suggestion" as const,
        postId: payload.postId,
        postCaption: payload.postCaption,
        postPlaceId: row.post_place_id,
        suggestions: payload.suggestions,
      }
    }
    case "system": {
      const payload = row.payload as SystemPayload
      return { ...base, kind: "system" as const, title: payload.title, body: payload.body }
    }
    default: {
      const payload = row.payload as ActorPayload
      return {
        ...base,
        kind,
        actorName: payload.actorName,
        actorInitials: payload.actorInitials,
        ...(payload.postId ? { postId: payload.postId } : {}),
        ...(payload.excerpt ? { excerpt: payload.excerpt } : {}),
      }
    }
  }
}

export type NotificationDto = ReturnType<typeof toNotificationDto>

/** Trang thông báo của một user, mới nhất trước. */
export async function listNotifications(
  userId: string,
  cursor: Cursor | null,
  pageSize: number,
): Promise<{ items: NotificationDto[]; next: Cursor | null }> {
  const conditions: Prisma.Sql[] = [Prisma.sql`n.user_id = ${userId}::uuid`]
  if (cursor) {
    conditions.push(
      Prisma.sql`(n.created_at, n.id) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`,
    )
  }

  const rows = await prisma.$queryRaw<NotificationRow[]>(Prisma.sql`
    SELECT n.id, n.type::text AS type, n.payload, n.read_at, n.created_at,
           p.place_id AS post_place_id
    FROM notifications n
    LEFT JOIN posts p ON p.id = NULLIF(n.payload->>'postId', '')::uuid
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY n.created_at DESC, n.id DESC
    LIMIT ${pageSize + 1}
  `)

  const page = rows.slice(0, pageSize)
  const last = page.at(-1)
  return {
    items: page.map(toNotificationDto),
    next: rows.length > pageSize && last ? { createdAt: last.created_at, id: last.id } : null,
  }
}
