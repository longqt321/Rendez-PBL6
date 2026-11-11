import { Hono } from "hono"
import type { Context } from "hono"
import { streamSSE } from "hono/streaming"
import {
  createProposalInputSchema,
  createRoomInputSchema,
  joinRoomInputSchema,
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
  type RoomWithRelations,
} from "../lib/rooms"
import { getViewer, requireAuth } from "../lib/session"
import { UUID_ID_RE } from "../lib/cursor"

/**
 * Route phòng lọc nhóm (Phase 6) — hợp đồng mới, xem `@rendez/schema` room.
 *
 * Danh tính: session user (chủ phòng) hoặc guest token trong cookie HttpOnly
 * theo phòng (`lib/room-token.ts`). KHÔNG đọc `memberId`/`actorId` từ query hay
 * body — mọi mutation đi qua `resolveRoomActor`.
 *
 * SSE chỉ phát `event: room-updated` + `{version}` (trung tính); client tự
 * `GET /rooms/:code` để nhận DTO tính `isMe` theo đúng danh tính của nó.
 */

/** Base32 Crockford: 0-9, A-H, J, K, M, N, P-T, V-Z (bỏ I, L, O, U). */
const CODE_RE = /^[0-9A-HJKMNP-TV-Z]{6}$/

/** Nhịp heartbeat giữ kết nối SSE sống qua proxy (15s). */
const SSE_HEARTBEAT_MS = 15_000

/** Giới hạn đọc/join theo IP — dùng bảng rate_limits sẵn có (như /session). */
const READ_RATE_LIMIT = { scope: "rooms-read", limit: 240, windowSeconds: 60 } as const
const JOIN_RATE_LIMIT = { scope: "rooms-join", limit: 20, windowSeconds: 60 } as const

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

/** DTO cho một người xem cụ thể — `isMe` tính từ session hoặc guest token. */
async function roomDtoFor(c: Context<AppEnv>, room: RoomWithRelations): Promise<Room> {
  const viewer = await getViewer(c)
  const actor = tryResolveRoomActor(c, room, viewer)
  return toRoomDto(room, viewer?.id ?? null, actor?.memberId ?? null)
}

export function createRoomsRouter() {
  const router = new Hono<AppEnv>()

  /** Tạo phòng — chủ phòng là thành viên đầu tiên (cần đăng nhập). */
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

  /** Trạng thái phòng — công khai với ai có mã (guest được). */
  router.get("/rooms/:code", rateLimit(READ_RATE_LIMIT), async (c) => {
    const code = requireCode(c.req.param("code"))
    const room = await loadRoom(code)
    return c.json(await roomDtoFor(c, room))
  })

  /** Tham gia bằng tên hiển thị — token cũ khớp thì idempotent, trùng tên → 409. */
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

  /** Thêm đề xuất — chỉ thành viên của phòng (danh tính từ session/cookie). */
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

    const updated = await addProposal(room, { ...parsed.data, memberId: actor.memberId, value })
    publishRoom(code)
    return c.json(await roomDtoFor(c, updated), 201)
  })

  /**
   * Áp đề xuất vào filter chung — CAS bằng `updateMany where status=open`:
   * hai request song song chỉ một thắng, request còn lại nhận 409.
   * Quyền: tác giả đề xuất hoặc chủ phòng (D-057).
   */
  router.post("/rooms/:code/proposals/:proposalId/apply", async (c) => {
    const code = requireCode(c.req.param("code"))
    const proposalId = c.req.param("proposalId") ?? ""
    if (!UUID_ID_RE.test(proposalId)) throw new ApiError(404, "Không tìm thấy đề xuất")

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

  /** Bỏ qua đề xuất — không đổi filter; quyền như apply. */
  router.post("/rooms/:code/proposals/:proposalId/dismiss", async (c) => {
    const code = requireCode(c.req.param("code"))
    const proposalId = c.req.param("proposalId") ?? ""
    if (!UUID_ID_RE.test(proposalId)) throw new ApiError(404, "Không tìm thấy đề xuất")

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

  /**
   * Rời phòng — xoá thành viên và mọi đề xuất của họ (khớp `leaveRoom`).
   *
   * Actor lấy từ session/cookie; mỗi thành viên chỉ rời được chính mình, chủ
   * phòng (theo `room.ownerId`) được xoá người khác. Rời chính mình → xoá cookie.
   */
  router.delete("/rooms/:code/members/:memberId", async (c) => {
    const code = requireCode(c.req.param("code"))
    const room = await loadRoom(code)
    const actor = await resolveRoomActor(c, room)

    const targetId = c.req.param("memberId")
    if (!UUID_ID_RE.test(targetId)) throw new ApiError(403, "Bạn không ở trong phòng này")
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

  /**
   * SSE — báo "phòng vừa đổi" bằng `event: room-updated` + `{version}`.
   *
   * Payload trung tính: không `isMe`, không `memberId`/token của actor. Client
   * nhận event rồi refetch `GET /rooms/:code` (server tính `isMe` per-viewer).
   * Subscribe TRƯỚC khi đọc version để không mất update giữa hai bước.
   */
  router.get("/rooms/:code/events", async (c) => {
    const code = requireCode(c.req.param("code"))
    await loadRoom(code)

    return streamSSE(c, async (stream) => {
      let unsubscribe = () => {}
      const closed = new Promise<void>((resolve) => {
        unsubscribe = subscribeRoom(code, (event) => {
          // Ghi lỗi chỉ xảy ra khi client đã ngắt — `onAbort` đã dọn subscriber.
          void stream
            .writeSSE({ event: "room-updated", data: JSON.stringify(event) })
            .catch(() => {})
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
    })
  })

  return router
}
