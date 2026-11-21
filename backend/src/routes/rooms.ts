import { Hono } from "hono"
import type { Context } from "hono"
import { streamSSE, type SSEStreamingApi } from "hono/streaming"
import {
  createProposalInputSchema,
  createRoomInputSchema,
  joinRoomInputSchema,
  updateRoomFilterInputSchema,
  type Room,
} from "@rendez/schema"
import type { AppEnv } from "../app"
import { ApiError } from "../lib/errors"
import { prisma } from "../lib/prisma"
import { toApiProposalField } from "../lib/enums"
import { publishRoom, roomVersion, subscribeRoom } from "../lib/room-events"
import { resolveRoomActor, tryResolveRoomActor } from "../lib/room-actor"
import { clearRoomTokenCookie, readRoomToken, setRoomTokenCookie } from "../lib/room-token"
import { rateLimit } from "../lib/rate-limit"
import {
  addProposal,
  applyProposalToFilter,
  createRoom,
  describeProposal,
  findRoomByCode,
  joinRoom,
  normalizeProposalValue,
  parseRoomFilter,
  serializeRoomFilter,
  toRoomDto,
  updateRoomFilter,
  type RoomWithRelations,
} from "../lib/rooms"
import { getViewer, requireAuth } from "../lib/session"
import { requireUuid } from "../lib/cursor"

const CODE_RE = /^[0-9A-HJKMNP-TV-Z]{6}$/

const SSE_HEARTBEAT_MS = 15_000

const READ_RATE_LIMIT = { scope: "rooms-read", limit: 60, windowSeconds: 60 } as const
const JOIN_RATE_LIMIT = { scope: "rooms-join", limit: 20, windowSeconds: 60 } as const
const EVENTS_RATE_LIMIT = { scope: "rooms-events", limit: 30, windowSeconds: 60 } as const

function requireCode(raw: string | undefined): string {
  const code = (raw ?? "").toUpperCase()
  if (!CODE_RE.test(code)) throw new ApiError(404, "Không tìm thấy phòng")
  return code
}

async function loadRoom(code: string): Promise<RoomWithRelations> {
  const room = await findRoomByCode(code)
  if (!room) throw new ApiError(404, "Không tìm thấy phòng")
  return room
}

async function roomDtoFor(c: Context<AppEnv>, room: RoomWithRelations): Promise<Room> {
  const viewer = await getViewer(c)
  const actor = tryResolveRoomActor(c, room, viewer)
  return toRoomDto(room, viewer?.id ?? null, actor?.memberId ?? null)
}

async function streamRoomEvents(stream: SSEStreamingApi, code: string): Promise<void> {
  let unsubscribe = () => {}
  const closed = new Promise<void>((resolve) => {
    unsubscribe = subscribeRoom(code, (event) => {
      // Ghi lỗi chỉ xảy ra khi client đã ngắt — `onAbort` đã dọn subscriber.
      void stream.writeSSE({ event: "room-updated", data: JSON.stringify(event) }).catch(() => {})
    })
    stream.onAbort(() => {
      unsubscribe()
      resolve()
    })
  })

  await stream.writeSSE({
    event: "room-updated",
    data: JSON.stringify({ version: roomVersion(code) }),
  })

  const heartbeat = setInterval(() => {
    void stream.writeSSE({ event: "ping", data: "{}" }).catch(() => {})
  }, SSE_HEARTBEAT_MS)

  await closed
  clearInterval(heartbeat)
}

export function createRoomsRouter() {
  const router = new Hono<AppEnv>()

  router.post("/rooms", requireAuth, async (c) => {
    const raw = await c.req.json().catch(() => ({}))
    const parsed = createRoomInputSchema.safeParse(raw ?? {})
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
    }

    const viewer = await getViewer(c)
    if (!viewer) throw new ApiError(401, "Chưa đăng nhập")

    const { room, guestToken } = await createRoom(c.get("userId"), parsed.data.name, viewer.name)
    // Chủ phòng cũng nhận token (dùng được khi phiên hết hạn) — trả đúng một lần.
    setRoomTokenCookie(c, room.code, guestToken)
    const dto = toRoomDto(room, viewer.id, null)
    return c.json({ ...dto, guestToken }, 201)
  })

  router.get("/rooms/:code", rateLimit(READ_RATE_LIMIT), async (c) => {
    const code = requireCode(c.req.param("code"))
    const room = await loadRoom(code)
    return c.json(await roomDtoFor(c, room))
  })

  router.post("/rooms/:code/join", rateLimit(JOIN_RATE_LIMIT), async (c) => {
    const code = requireCode(c.req.param("code"))
    const room = await loadRoom(code)

    const raw = await c.req.json().catch(() => null)
    const parsed = joinRoomInputSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Tên hiển thị không hợp lệ")
    }

    const result = await joinRoom(room, parsed.data.displayName, readRoomToken(c, code))
    if (result.guestToken) setRoomTokenCookie(c, code, result.guestToken)

    const viewer = await getViewer(c)
    const dto = toRoomDto(result.room, viewer?.id ?? null, result.memberId)
    if (result.joined) publishRoom(code)
    return c.json({
      room: dto,
      memberId: result.memberId,
      joined: result.joined,
      ...(result.guestToken ? { guestToken: result.guestToken } : {}),
    })
  })

  router.post("/rooms/:code/proposals", async (c) => {
    const code = requireCode(c.req.param("code"))
    const room = await loadRoom(code)
    const actor = await resolveRoomActor(c, room)

    const raw = await c.req.json().catch(() => null)
    const parsed = createProposalInputSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Đề xuất không hợp lệ")
    }

    const value = normalizeProposalValue(parsed.data.field, parsed.data.value)
    if (value === null) {
      throw new ApiError(400, "Giá trị đề xuất không hợp lệ")
    }

    const updated = await addProposal(room, {
      ...parsed.data,
      memberId: actor.memberId,
      value,
    })
    publishRoom(code)
    return c.json(await roomDtoFor(c, updated), 201)
  })

  router.post("/rooms/:code/filter", async (c) => {
    const code = requireCode(c.req.param("code"))
    const room = await loadRoom(code)
    await resolveRoomActor(c, room)

    const raw = await c.req.json().catch(() => null)
    const parsed = updateRoomFilterInputSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(
        400,
        parsed.error.issues[0]?.message ?? "Yêu cầu cập nhật bộ lọc không hợp lệ",
      )
    }

    const updated = await updateRoomFilter(room.id, code, parsed.data)
    publishRoom(code)
    return c.json(await roomDtoFor(c, updated))
  })

  router.post("/rooms/:code/proposals/:proposalId/apply", async (c) => {
    const code = requireCode(c.req.param("code"))
    const proposalId = c.req.param("proposalId") ?? ""
    requireUuid(proposalId, "Không tìm thấy đề xuất")

    const room = await loadRoom(code)
    const actor = await resolveRoomActor(c, room)
    const proposal = room.proposals.find((item) => item.id === proposalId)
    if (!proposal) throw new ApiError(404, "Không tìm thấy đề xuất")
    if (proposal.memberId !== actor.memberId && !actor.isOwner) {
      throw new ApiError(403, "Chỉ tác giả đề xuất hoặc chủ phòng mới được áp dụng")
    }

    const applied = await prisma.$transaction(async (tx) => {
      const result = await tx.roomProposal.updateMany({
        where: { id: proposalId, roomId: room.id, status: "open" },
        data: { status: "applied", appliedBy: actor.memberId, appliedAt: new Date() },
      })
      if (result.count === 0) return false

      // Đọc filter ngay trong transaction để giảm cửa sổ lost-update giữa hai
      // đề xuất khác nhau (xem BACKLOG về khoá hàng khi scale).
      const current = await tx.room.findUniqueOrThrow({ where: { id: room.id } })
      const filter = applyProposalToFilter(parseRoomFilter(current.filter), {
        kind: proposal.kind,
        field: toApiProposalField(proposal.field),
        value: proposal.value,
      })
      await tx.room.update({
        where: { id: room.id },
        data: { filter: serializeRoomFilter(filter) },
      })
      return true
    })

    if (!applied) throw new ApiError(409, "Đề xuất đã được áp dụng hoặc đã bị bỏ")

    const updated = await loadRoom(code)
    publishRoom(code)
    return c.json({
      room: await roomDtoFor(c, updated),
      summary: describeProposal({
        kind: proposal.kind,
        field: toApiProposalField(proposal.field),
        value: proposal.value,
      }),
    })
  })

  router.post("/rooms/:code/proposals/:proposalId/dismiss", async (c) => {
    const code = requireCode(c.req.param("code"))
    const proposalId = c.req.param("proposalId") ?? ""
    requireUuid(proposalId, "Không tìm thấy đề xuất")

    const room = await loadRoom(code)
    const actor = await resolveRoomActor(c, room)
    const proposal = room.proposals.find((item) => item.id === proposalId)
    if (!proposal) throw new ApiError(404, "Không tìm thấy đề xuất")
    if (proposal.memberId !== actor.memberId && !actor.isOwner) {
      throw new ApiError(403, "Chỉ tác giả đề xuất hoặc chủ phòng mới được bỏ qua")
    }

    const result = await prisma.roomProposal.updateMany({
      where: { id: proposalId, roomId: room.id, status: "open" },
      data: { status: "dismissed" },
    })
    if (result.count === 0) throw new ApiError(409, "Đề xuất đã được áp dụng hoặc đã bị bỏ")

    const updated = await loadRoom(code)
    publishRoom(code)
    return c.json(await roomDtoFor(c, updated))
  })

  router.delete("/rooms/:code/members/:memberId", async (c) => {
    const code = requireCode(c.req.param("code"))
    const room = await loadRoom(code)
    const actor = await resolveRoomActor(c, room)

    const targetId = c.req.param("memberId")
    requireUuid(targetId, "Bạn không ở trong phòng này", 403)
    const target = room.members.find((item) => item.id === targetId)
    if (!target) throw new ApiError(403, "Bạn không ở trong phòng này")

    if (actor.memberId !== target.id && !actor.isOwner) {
      throw new ApiError(403, "Chỉ chủ phòng mới được cho người khác rời phòng")
    }

    // `deleteMany` idempotent — không ném P2025 nếu hàng vừa bị xoá.
    await prisma.roomMember.deleteMany({ where: { id: target.id, roomId: room.id } })
    if (actor.memberId === target.id) clearRoomTokenCookie(c, code)

    const updated = await loadRoom(code)
    publishRoom(code)
    const viewer = await getViewer(c)
    return c.json(toRoomDto(updated, viewer?.id ?? null, null))
  })

  router.get("/rooms/:code/events", rateLimit(EVENTS_RATE_LIMIT), async (c) => {
    const code = requireCode(c.req.param("code"))
    const room = await loadRoom(code)
    // Chỉ thành viên đã tham gia phòng (có guest token hoặc user member) mới được mở SSE stream
    await resolveRoomActor(c, room)

    return streamSSE(c, (stream) => streamRoomEvents(stream, code))
  })

  return router
}
