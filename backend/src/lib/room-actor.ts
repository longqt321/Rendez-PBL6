import type { Context } from "hono"
import type { AppEnv } from "../app"
import type { User } from "../../generated/prisma/client"
import { ApiError } from "./errors"
import { getViewer } from "./session"
import { hashRoomToken, readRoomToken } from "./room-token"
import { touchMemberSeen, type RoomWithRelations } from "./rooms"

/**
 * Danh tính người thao tác trong một phòng — xác thực từ session/cookie, KHÔNG
 * bao giờ từ `memberId`/`actorId` client khai trong query/body (chặn IDOR).
 *
 * Thứ tự: session user (nếu có member liên kết) → guest token trong cookie
 * HttpOnly của đúng phòng. Không khớp cả hai → 403.
 */
export interface RoomActor {
  memberId: string
  isOwner: boolean
}

/** Phần xác thực thuần (không đọc session) — dùng lại khi route đã có viewer. */
function actorFromViewer(
  c: Context<AppEnv>,
  room: RoomWithRelations,
  viewer: User | null,
): RoomActor | null {
  if (viewer) {
    const member = room.members.find((item) => item.userId === viewer.id)
    if (member) return { memberId: member.id, isOwner: room.ownerId === viewer.id }
  }

  const rawToken = readRoomToken(c, room.code)
  if (rawToken) {
    const hash = hashRoomToken(rawToken)
    const member = room.members.find((item) => item.tokenHash === hash)
    if (member) {
      void touchMemberSeen(member.id)
      return { memberId: member.id, isOwner: false }
    }
  }

  return null
}

export async function resolveRoomActor(
  c: Context<AppEnv>,
  room: RoomWithRelations,
): Promise<RoomActor> {
  const actor = actorFromViewer(c, room, await getViewer(c))
  if (!actor) throw new ApiError(403, "Bạn không ở trong phòng này")
  return actor
}

/** Như `resolveRoomActor` nhưng route đọc công khai: không danh tính → `null`. */
export function tryResolveRoomActor(
  c: Context<AppEnv>,
  room: RoomWithRelations,
  viewer: User | null,
): RoomActor | null {
  return actorFromViewer(c, room, viewer)
}
