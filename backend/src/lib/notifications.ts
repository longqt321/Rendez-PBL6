import type { Prisma } from "../../generated/prisma/client"
import { UUID_ID_RE, type Cursor } from "./cursor"
import { toApiNotificationType, toPrismaNotificationType } from "./enums"
import { publishNotification } from "./notification-events"
import { prisma } from "./prisma"
import { formatInitials } from "./profile"

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
