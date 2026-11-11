import { Hono } from "hono"
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
import { publishRoom, subscribeRoom } from "../lib/room-events"
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
 * Khách tham gia bằng tên hiển thị (D5) và nhận `memberId` để gửi kèm các lần
 * gọi sau (`?memberId=` hoặc body đề xuất) — server dùng nó để tính `isMe` và
 * kiểm quyền thao tác trên đề xuất của chính thành viên đó.
 *
 * Mọi mutation đều `publishRoom` để client đang mở SSE thấy trạng thái mới.
 */

const CODE_RE = /^[A-Z2-9]{6}$/

/** Nhịp heartbeat giữ kết nối SSE sống qua proxy (15s). */
const SSE_HEARTBEAT_MS = 15_000

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

/** Thành viên phải thuộc phòng — nếu không thì 403 (không lộ mã phòng hợp lệ). */
function requireMember(room: RoomWithRelations, memberId: string | undefined): string {
  if (!memberId || !UUID_ID_RE.test(memberId))
    throw new ApiError(403, "Bạn không ở trong phòng này")
  const member = room.members.find((item) => item.id === memberId)
  if (!member) throw new ApiError(403, "Bạn không ở trong phòng này")
  return member.id
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

    const room = await createRoom(viewer.id, parsed.data.name, viewer.name)
    const dto = toRoomDto(room, viewer.id, null)
    return c.json(dto, 201)
  })

  /** Trạng thái phòng — công khai với ai có mã (guest được). */
  router.get("/rooms/:code", async (c) => {
    const code = requireCode(c.req.param("code"))
    const room = await loadRoom(code)
    const viewer = await getViewer(c)
    return c.json(toRoomDto(room, viewer?.id ?? null, c.req.query("memberId") ?? null))
  })

  /** Tham gia bằng tên hiển thị — idempotent theo tên (không phân biệt hoa thường). */
  router.post("/rooms/:code/join", async (c) => {
    const code = requireCode(c.req.param("code"))
    const room = await loadRoom(code)

    const raw = await c.req.json().catch(() => null)
    const parsed = joinRoomInputSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Tên hiển thị không hợp lệ")
    }

    const result = await joinRoom(room, parsed.data.displayName)
    const viewer = await getViewer(c)
    const dto = toRoomDto(result.room, viewer?.id ?? null, result.memberId)
    if (result.joined) publishRoom(code, dto)
    return c.json({ room: dto, memberId: result.memberId, joined: result.joined })
  })

  /** Thêm đề xuất — chỉ thành viên của phòng. */
  router.post("/rooms/:code/proposals", async (c) => {
    const code = requireCode(c.req.param("code"))
    const room = await loadRoom(code)

    const raw = await c.req.json().catch(() => null)
    const parsed = createProposalInputSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Đề xuất không hợp lệ")
    }
    requireMember(room, parsed.data.memberId)

    const value = normalizeProposalValue(parsed.data.field, parsed.data.value)
    if (value === null) {
      throw new ApiError(400, "Giá trị đề xuất không hợp lệ")
    }

    const updated = await addProposal(room, { ...parsed.data, value })
    const viewer = await getViewer(c)
    const dto = toRoomDto(updated, viewer?.id ?? null, parsed.data.memberId)
    publishRoom(code, dto)
    return c.json(dto, 201)
  })

  /** Áp đề xuất vào filter chung — một transaction, trả kèm mô tả cho toast. */
  router.post("/rooms/:code/proposals/:proposalId/apply", async (c) => {
    const code = requireCode(c.req.param("code"))
    const proposalId = c.req.param("proposalId") ?? ""
    if (!UUID_ID_RE.test(proposalId)) throw new ApiError(404, "Không tìm thấy đề xuất")

    const room = await loadRoom(code)
    const memberId = requireMember(room, c.req.query("memberId") ?? undefined)
    const proposal = room.proposals.find((item) => item.id === proposalId)
    if (!proposal) throw new ApiError(404, "Không tìm thấy đề xuất")
    if (proposal.status !== "open") throw new ApiError(400, "Đề xuất đã được xử lý")

    const filter = applyProposalToFilter(parseRoomFilter(room.filter), {
      kind: proposal.kind,
      field: toApiProposalField(proposal.field),
      value: proposal.value,
    })

    await prisma.$transaction([
      prisma.roomProposal.update({ where: { id: proposalId }, data: { status: "applied" } }),
      prisma.room.update({ where: { id: room.id }, data: { filter: serializeRoomFilter(filter) } }),
    ])

    const updated = await loadRoom(code)
    const viewer = await getViewer(c)
    const dto = toRoomDto(updated, viewer?.id ?? null, memberId)
    publishRoom(code, dto)
    return c.json({
      room: dto,
      summary: describeProposal({
        kind: proposal.kind,
        field: toApiProposalField(proposal.field),
        value: proposal.value,
      }),
    })
  })

  /** Bỏ qua đề xuất — không đổi filter. */
  router.post("/rooms/:code/proposals/:proposalId/dismiss", async (c) => {
    const code = requireCode(c.req.param("code"))
    const proposalId = c.req.param("proposalId") ?? ""
    if (!UUID_ID_RE.test(proposalId)) throw new ApiError(404, "Không tìm thấy đề xuất")

    const room = await loadRoom(code)
    const memberId = requireMember(room, c.req.query("memberId") ?? undefined)
    const proposal = room.proposals.find((item) => item.id === proposalId)
    if (!proposal) throw new ApiError(404, "Không tìm thấy đề xuất")
    if (proposal.status !== "open") throw new ApiError(400, "Đề xuất đã được xử lý")

    await prisma.roomProposal.update({ where: { id: proposalId }, data: { status: "dismissed" } })

    const updated = await loadRoom(code)
    const viewer = await getViewer(c)
    const dto = toRoomDto(updated, viewer?.id ?? null, memberId)
    publishRoom(code, dto)
    return c.json(dto)
  })

  /**
   * Rời phòng — xoá thành viên và mọi đề xuất của họ (khớp `leaveRoom`).
   *
   * Quyền: mỗi thành viên chỉ rời được chính mình; chủ phòng được mời thêm
   * người khác. Gọi với memberId của người khác khi không phải chủ phòng → 403.
   */
  router.delete("/rooms/:code/members/:memberId", async (c) => {
    const code = requireCode(c.req.param("code"))
    const room = await loadRoom(code)
    const memberId = requireMember(room, c.req.param("memberId"))

    const actorId = requireMember(room, c.req.query("actorId") ?? undefined)
    const actor = room.members.find((item) => item.id === actorId)
    const isOwner = actor?.userId != null && actor.userId === room.ownerId
    if (actorId !== memberId && !isOwner) {
      throw new ApiError(403, "Chỉ chủ phòng mới được cho người khác rời phòng")
    }

    await prisma.roomMember.delete({ where: { id: memberId } })

    const updated = await loadRoom(code)
    const viewer = await getViewer(c)
    const dto = toRoomDto(updated, viewer?.id ?? null, null)
    publishRoom(code, dto)
    return c.json(dto)
  })

  /**
   * SSE — đẩy trạng thái phòng mỗi khi có thay đổi (T6.3).
   *
   * Gửi `event: room` kèm JSON `Room`; heartbeat comment mỗi 15s để proxy
   * không cắt kết nối. Client tự đóng khi rời trang.
   */
  router.get("/rooms/:code/events", async (c) => {
    const code = requireCode(c.req.param("code"))
    const room = await loadRoom(code)
    const viewer = await getViewer(c)
    const memberId = c.req.query("memberId") ?? null
    const initial: Room = toRoomDto(room, viewer?.id ?? null, memberId)

    return streamSSE(c, async (stream) => {
      await stream.writeSSE({ event: "room", data: JSON.stringify(initial) })

      let unsubscribe = () => {}
      const closed = new Promise<void>((resolve) => {
        unsubscribe = subscribeRoom(code, (next) => {
          // Ghi lỗi chỉ xảy ra khi client đã ngắt — `onAbort` bên dưới đã dọn
          // subscriber nên không cần xử lý thêm, chỉ tránh unhandled rejection.
          void stream.writeSSE({ event: "room", data: JSON.stringify(next) }).catch(() => {})
        })
        stream.onAbort(() => {
          unsubscribe()
          resolve()
        })
      })

      // Giữ handler sống tới khi client ngắt; heartbeat song song.
      const heartbeat = setInterval(() => {
        void stream.writeSSE({ event: "ping", data: "{}" }).catch(() => {})
      }, SSE_HEARTBEAT_MS)

      await closed
      clearInterval(heartbeat)
    })
  })

  return router
}
