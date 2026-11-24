import type { Prisma } from "../../generated/prisma/client"
import { UUID_ID_RE, type Cursor } from "./cursor"
import { toApiNotificationType, toPrismaNotificationType } from "./enums"
import { publishNotification } from "./notification-events"
import { prisma } from "./prisma"
import { formatInitials } from "./profile"

export type NotificationKind =
  "place-suggestion" | "like" | "comment" | "follow" | "system" | "direct-message" | "room-event"

interface ActorPayload {
  actorId?: string
  actorName: string
  actorInitials: string
  actorHandle?: string
  actorAvatarUrl?: string | null
  postId?: string
  excerpt?: string
}

interface DirectMessagePayload {
  actorId?: string
  actorName: string
  actorInitials: string
  actorHandle?: string
  actorAvatarUrl?: string | null
  messageExcerpt?: string
}

interface RoomEventPayload {
  roomCode: string
  roomName: string
  eventType: "voting_started" | "room_finalized"
  winnerPlaceName?: string
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

function extractPostId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const raw = (payload as Record<string, unknown>).postId
  return typeof raw === "string" && UUID_ID_RE.test(raw) ? raw : null
}

async function attachPostPlaceIds(
  records: { id: string; type: string; payload: unknown; readAt: Date | null; createdAt: Date }[],
): Promise<NotificationRow[]> {
  const postIds = [
    ...new Set(
      records.map((r) => extractPostId(r.payload)).filter((id): id is string => id !== null),
    ),
  ]
  const postPlaceMap = new Map<string, string | null>()
  if (postIds.length > 0) {
    const posts = await prisma.post.findMany({
      where: { id: { in: postIds } },
      select: { id: true, placeId: true },
    })
    for (const post of posts) {
      postPlaceMap.set(post.id, post.placeId)
    }
  }

  return records.map((record) => {
    const postId = extractPostId(record.payload)
    return {
      id: record.id,
      type: record.type,
      payload: record.payload,
      read_at: record.readAt,
      created_at: record.createdAt,
      post_place_id: postId ? (postPlaceMap.get(postId) ?? null) : null,
    }
  })
}

export async function createActorNotification(params: {
  userId: string
  kind: "like" | "comment" | "follow"
  actor: { id: string; name: string; handle?: string; avatarUrl?: string | null }
  postId?: string
  excerpt?: string
}): Promise<void> {
  if (params.actor.id === params.userId) return

  let actorHandle = params.actor.handle
  let actorAvatarUrl = params.actor.avatarUrl
  if (actorHandle === undefined || actorAvatarUrl === undefined) {
    const u = await prisma.user.findUnique({
      where: { id: params.actor.id },
      select: { handle: true, avatarUrl: true },
    })
    if (u) {
      actorHandle ??= u.handle
      if (actorAvatarUrl === undefined) actorAvatarUrl = u.avatarUrl
    }
  }

  const payload: Prisma.InputJsonObject = {
    actorId: params.actor.id,
    actorName: params.actor.name,
    actorInitials: formatInitials(params.actor.name),
    ...(actorHandle ? { actorHandle } : {}),
    ...(actorAvatarUrl !== undefined ? { actorAvatarUrl } : {}),
    ...(params.postId ? { postId: params.postId } : {}),
    ...(params.excerpt ? { excerpt: params.excerpt } : {}),
  }

  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: toPrismaNotificationType(params.kind),
      payload,
    },
  })
  publishNotification(params.userId)
}

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
      payload,
    },
    select: { id: true },
  })
  if (!params.client) publishNotification(params.userId)
  return created.id
}

export async function isNotificationEnabled(
  userId: string,
  kind: NotificationKind,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPrefs: true },
  })
  if (!user?.notificationPrefs || typeof user.notificationPrefs !== "object") return true
  const prefs = user.notificationPrefs as Record<string, boolean>
  if (prefs[kind] === false) return false
  return true
}

export async function createDirectMessageNotification(params: {
  userId: string
  actor: { id: string; name: string; handle?: string; avatarUrl?: string | null }
  messageExcerpt?: string
}): Promise<void> {
  if (params.actor.id === params.userId) return
  if (!(await isNotificationEnabled(params.userId, "direct-message"))) return

  const payload: Prisma.InputJsonObject = {
    actorId: params.actor.id,
    actorName: params.actor.name,
    actorInitials: formatInitials(params.actor.name),
    ...(params.actor.handle ? { actorHandle: params.actor.handle } : {}),
    ...(params.actor.avatarUrl !== undefined ? { actorAvatarUrl: params.actor.avatarUrl } : {}),
    ...(params.messageExcerpt ? { messageExcerpt: params.messageExcerpt } : {}),
  }

  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: toPrismaNotificationType("direct-message"),
      payload,
    },
  })
  publishNotification(params.userId)
}

export async function createRoomEventNotification(params: {
  userId: string
  roomCode: string
  roomName: string
  eventType: "voting_started" | "room_finalized"
  winnerPlaceName?: string
}): Promise<void> {
  if (!(await isNotificationEnabled(params.userId, "room-event"))) return

  const payload: Prisma.InputJsonObject = {
    roomCode: params.roomCode,
    roomName: params.roomName,
    eventType: params.eventType,
    ...(params.winnerPlaceName ? { winnerPlaceName: params.winnerPlaceName } : {}),
  }

  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: toPrismaNotificationType("room-event"),
      payload,
    },
  })
  publishNotification(params.userId)
}

export async function createSystemNotification(params: {
  userId: string
  title: string
  body: string
}): Promise<void> {
  if (!(await isNotificationEnabled(params.userId, "system"))) return

  const payload: Prisma.InputJsonObject = {
    title: params.title,
    body: params.body,
  }

  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: toPrismaNotificationType("system"),
      payload,
    },
  })
  publishNotification(params.userId)
}

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
    case "direct-message": {
      const payload = row.payload as DirectMessagePayload
      return {
        ...base,
        kind: "direct-message" as const,
        actorName: payload.actorName,
        actorInitials: payload.actorInitials,
        ...(payload.actorHandle ? { actorHandle: payload.actorHandle } : {}),
        ...(payload.actorAvatarUrl !== undefined ? { actorAvatarUrl: payload.actorAvatarUrl } : {}),
        ...(payload.messageExcerpt ? { messageExcerpt: payload.messageExcerpt } : {}),
      }
    }
    case "room-event": {
      const payload = row.payload as RoomEventPayload
      return {
        ...base,
        kind: "room-event" as const,
        roomCode: payload.roomCode,
        roomName: payload.roomName,
        eventType: payload.eventType,
        ...(payload.winnerPlaceName ? { winnerPlaceName: payload.winnerPlaceName } : {}),
      }
    }
    default: {
      const payload = row.payload as ActorPayload
      return {
        ...base,
        kind,
        actorName: payload.actorName,
        actorInitials: payload.actorInitials,
        ...(payload.actorHandle ? { actorHandle: payload.actorHandle } : {}),
        ...(payload.actorAvatarUrl !== undefined ? { actorAvatarUrl: payload.actorAvatarUrl } : {}),
        ...(payload.postId ? { postId: payload.postId } : {}),
        ...(payload.excerpt ? { excerpt: payload.excerpt } : {}),
      }
    }
  }
}

export type NotificationDto = ReturnType<typeof toNotificationDto>

export async function listNotifications(
  userId: string,
  cursor: Cursor | null,
  pageSize: number,
): Promise<{ items: NotificationDto[]; next: Cursor | null }> {
  const records = await prisma.notification.findMany({
    where: {
      userId,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    },
    select: { id: true, type: true, payload: true, readAt: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: pageSize + 1,
  })

  const page = records.slice(0, pageSize)
  const last = page.at(-1)
  const rows = await attachPostPlaceIds(page)
  return {
    items: rows.map(toNotificationDto),
    next: records.length > pageSize && last ? { createdAt: last.createdAt, id: last.id } : null,
  }
}

export async function listAllNotifications(userId: string): Promise<NotificationDto[]> {
  const records = await prisma.notification.findMany({
    where: { userId },
    select: { id: true, type: true, payload: true, readAt: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })
  const rows = await attachPostPlaceIds(records)
  return rows.map(toNotificationDto)
}

export async function findNotificationById(id: string): Promise<NotificationDto | null> {
  const record = await prisma.notification.findUnique({
    where: { id },
    select: { id: true, type: true, payload: true, readAt: true, createdAt: true },
  })
  if (!record) return null
  const [row] = await attachPostPlaceIds([record])
  return row ? toNotificationDto(row) : null
}
