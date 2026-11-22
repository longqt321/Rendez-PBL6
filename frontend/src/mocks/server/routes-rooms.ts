import type { RoomProposal } from "@/features/rooms/types/room"
import { updateRoomFilterInputSchema } from "@rendez/schema"
import { CURRENT_USER } from "../fixtures/users"
import { MAX_MEMBER_NAME_LENGTH, MAX_ROOM_NAME_LENGTH } from "@rendez/schema"
import type { MockRoom, MockRoomMember } from "../types"
import {
  db,
  getRoomVotingState,
  nextRoomId,
  nextRoomMemberId,
  nextRoomProposalId,
  toPlaceDto,
  findPlace,
  notFound,
  badRequest,
  forbidden,
  conflict,
  unauthorized,
  parseBody,
  generateRoomCode,
  emptyRoomFilter,
  toRoomDto,
  resolveMockRoomActor,
  describeMockProposal,
  applyMockProposalToFilter,
  removeMockFilterConstraint,
  toggleMockFilterConstraint,
  normalizeMockProposalValue,
  type Route,
} from "./context"

export const roomMockRoutes: Route[] = [
  {
    method: "post",
    pattern: /^\/rooms\/([^/]+)\/candidates$/,
    handler: (config, match) => {
      const code = match[0]
      const room = db.rooms.find((r) => r.code === code.toUpperCase())
      if (!room) notFound(config, "Không tìm thấy phòng")
      const body = parseBody<{ placeId: string }>(config)
      const place = findPlace(body.placeId)
      if (!place) notFound(config, "Không tìm thấy quán")
      const st = getRoomVotingState(room.code)
      if (!st.candidates.some((c) => c.placeId === place.id)) {
        st.candidates.push({
          id: `cand-${Date.now()}-${st.candidates.length}`,
          placeId: place.id,
          addedByMemberId: room.members[0]?.id ?? "m1",
          place: toPlaceDto(place),
          createdAt: new Date().toISOString(),
        })
      }
      return toRoomDto(room)
    },
  },
  {
    method: "post",
    pattern: /^\/rooms\/([^/]+)\/voting\/start$/,
    handler: (config, match) => {
      const code = match[0]
      const room = db.rooms.find((r) => r.code === code.toUpperCase())
      if (!room) notFound(config, "Không tìm thấy phòng")
      const body = parseBody<{ votingMode: "swipe_match" | "ranked_choice" | "random_wheel" }>(
        config,
      )
      const st = getRoomVotingState(room.code)
      st.votingMode = body.votingMode
      if (body.votingMode === "random_wheel" && st.candidates.length > 0) {
        st.phase = "locked"
        st.winnerPlaceId = st.candidates[0].placeId
      } else {
        st.phase = "voting"
      }
      return toRoomDto(room)
    },
  },
  {
    method: "post",
    pattern: /^\/rooms\/([^/]+)\/votes$/,
    handler: (config, match) => {
      const code = match[0]
      const room = db.rooms.find((r) => r.code === code.toUpperCase())
      if (!room) notFound(config, "Không tìm thấy phòng")
      const st = getRoomVotingState(room.code)
      const meId =
        room.members.find((m) => m.userId === CURRENT_USER.id)?.id ?? room.members[0]?.id ?? "m1"
      const body = parseBody<{
        mode: string
        candidateId?: string
        decision?: "like" | "pass"
        rankings?: Array<{ candidateId: string; rank: number }>
      }>(config)
      if (body.mode === "swipe_match" && body.candidateId && body.decision) {
        st.votes = st.votes.filter(
          (v) => !(v.candidateId === body.candidateId && v.memberId === meId),
        )
        st.votes.push({ candidateId: body.candidateId, memberId: meId, decision: body.decision })
      } else if (body.mode === "ranked_choice" && Array.isArray(body.rankings)) {
        st.votes = st.votes.filter((v) => v.memberId !== meId)
        for (const r of body.rankings) {
          st.votes.push({ candidateId: r.candidateId, memberId: meId, rank: r.rank })
        }
      }
      return toRoomDto(room)
    },
  },
  {
    method: "post",
    pattern: /^\/rooms\/([^/]+)\/voting\/finalize$/,
    handler: (config, match) => {
      const code = match[0]
      const room = db.rooms.find((r) => r.code === code.toUpperCase())
      if (!room) notFound(config, "Không tìm thấy phòng")
      const st = getRoomVotingState(room.code)
      const body = parseBody<{ winnerPlaceId?: string }>(config)
      st.phase = "locked"
      st.winnerPlaceId = body.winnerPlaceId ?? st.candidates[0]?.placeId ?? null
      return toRoomDto(room)
    },
  },

  // Phòng lọc nhóm — mục cụ thể đứng trước `/rooms/:code`.
  {
    method: "post",
    pattern: /^\/rooms$/,
    handler: (config) => {
      // Tạo phòng cần đăng nhập (khớp backend).
      if (!db.authenticated) unauthorized(config, "Chưa đăng nhập")
      const body = parseBody<{ name?: unknown }>(config)
      const name = typeof body.name === "string" ? body.name.trim() : ""
      if (name.length > MAX_ROOM_NAME_LENGTH) {
        badRequest(config, `Tên phòng tối đa ${MAX_ROOM_NAME_LENGTH} ký tự`)
      }

      const now = new Date().toISOString()
      const owner: MockRoomMember = {
        id: nextRoomMemberId(),
        displayName: db.me.name,
        joinedAt: now,
        userId: CURRENT_USER.id,
      }
      const room: MockRoom = {
        id: nextRoomId(),
        code: generateRoomCode(),
        name: name || "Phòng lọc nhóm",
        members: [owner],
        proposals: [],
        filter: emptyRoomFilter(),
        createdAt: now,
      }
      db.rooms.push(room)
      // Mô phỏng Set-Cookie HttpOnly của backend.
      db.roomTokens[room.code] = owner.id
      return { ...toRoomDto(room), guestToken: `mock-room-token-${owner.id}` }
    },
  },
  {
    method: "get",
    pattern: /^\/rooms\/([^/]+)$/,
    handler: (config, [code]) => {
      const room = db.rooms.find((item) => item.code === code.toUpperCase())
      if (!room) notFound(config, "Không tìm thấy phòng")
      return toRoomDto(room)
    },
  },
  {
    method: "post",
    pattern: /^\/rooms\/([^/]+)\/join$/,
    handler: (config, [code]) => {
      const room = db.rooms.find((item) => item.code === code.toUpperCase())
      if (!room) notFound(config, "Không tìm thấy phòng")

      const body = parseBody<{ displayName?: unknown }>(config)
      const displayName = typeof body.displayName === "string" ? body.displayName.trim() : ""
      if (!displayName || displayName.length > MAX_MEMBER_NAME_LENGTH) {
        badRequest(config, "Tên hiển thị không hợp lệ")
      }

      // "Cookie" cũ khớp thành viên → idempotent, không tạo mới.
      const tokenMember = room.members.find((member) => member.id === db.roomTokens[room.code])
      if (tokenMember) {
        return { room: toRoomDto(room), memberId: tokenMember.id, joined: false }
      }

      const duplicate = room.members.some(
        (member) => member.displayName.toLowerCase() === displayName.toLowerCase(),
      )
      if (duplicate) conflict(config, "Tên này đã có người dùng trong phòng")

      const member: MockRoomMember = {
        id: nextRoomMemberId(),
        displayName,
        joinedAt: new Date().toISOString(),
        userId: null,
      }
      room.members.push(member)
      db.roomTokens[room.code] = member.id
      return {
        room: toRoomDto(room),
        memberId: member.id,
        joined: true,
        guestToken: `mock-room-token-${member.id}`,
      }
    },
  },
  {
    method: "post",
    pattern: /^\/rooms\/([^/]+)\/proposals$/,
    handler: (config, [code]) => {
      const room = db.rooms.find((item) => item.code === code.toUpperCase())
      if (!room) notFound(config, "Không tìm thấy phòng")
      const actor = resolveMockRoomActor(config, room)

      const body = parseBody<{
        kind?: unknown
        field?: unknown
        value?: unknown
        autoApply?: unknown
      }>(config)
      const kind = body.kind
      const field = body.field
      const rawValue = typeof body.value === "string" ? body.value.trim() : ""
      if (kind !== "include" && kind !== "exclude") badRequest(config, "Đề xuất không hợp lệ")
      if (
        field !== "category" &&
        field !== "district" &&
        field !== "priceMax" &&
        field !== "keyword"
      ) {
        badRequest(config, "Đề xuất không hợp lệ")
      }
      if (!rawValue || rawValue.length > 80) {
        badRequest(config, "Giá trị đề xuất không hợp lệ")
      }
      const value = normalizeMockProposalValue(field, rawValue)
      if (value === null) badRequest(config, "Giá trị đề xuất không hợp lệ")

      const proposal: RoomProposal = {
        id: nextRoomProposalId(),
        memberId: actor.id,
        kind,
        field,
        value,
        status: body.autoApply === true ? "applied" : "open",
        createdAt: new Date().toISOString(),
      }
      room.proposals.unshift(proposal)
      if (body.autoApply === true) {
        room.filter = applyMockProposalToFilter(room.filter, proposal)
      }
      return toRoomDto(room)
    },
  },
  {
    method: "post",
    pattern: /^\/rooms\/([^/]+)\/filter$/,
    handler: (config, [code]) => {
      const room = db.rooms.find((item) => item.code === code.toUpperCase())
      if (!room) notFound(config, "Không tìm thấy phòng")
      resolveMockRoomActor(config, room)

      const parsed = updateRoomFilterInputSchema.safeParse(parseBody(config))
      if (!parsed.success) badRequest(config, "Yêu cầu cập nhật bộ lọc không hợp lệ")

      if (parsed.data.action === "reset") {
        room.filter = emptyRoomFilter()
      } else if (parsed.data.action === "replace") {
        let built = emptyRoomFilter()
        for (const item of parsed.data.items) {
          const value = normalizeMockProposalValue(item.field, item.value)
          if (value === null) badRequest(config, "Giá trị bộ lọc không hợp lệ")
          built = applyMockProposalToFilter(built, {
            kind: item.kind,
            field: item.field,
            value,
          })
        }
        room.filter = built
      } else {
        const value = normalizeMockProposalValue(parsed.data.field, parsed.data.value)
        if (value === null) badRequest(config, "Giá trị bộ lọc không hợp lệ")
        const target = { kind: parsed.data.kind, field: parsed.data.field, value }
        room.filter =
          parsed.data.action === "remove"
            ? removeMockFilterConstraint(room.filter, target)
            : toggleMockFilterConstraint(room.filter, target)
      }
      return toRoomDto(room)
    },
  },
  {
    method: "post",
    pattern: /^\/rooms\/([^/]+)\/proposals\/([^/]+)\/apply$/,
    handler: (config, [code, proposalId]) => {
      const room = db.rooms.find((item) => item.code === code.toUpperCase())
      if (!room) notFound(config, "Không tìm thấy phòng")
      const actor = resolveMockRoomActor(config, room)
      const proposal = room.proposals.find((item) => item.id === proposalId)
      if (!proposal) notFound(config, "Không tìm thấy đề xuất")

      const isOwner = actor.userId !== null && actor.userId === CURRENT_USER.id
      if (proposal.memberId !== actor.id && !isOwner) {
        forbidden(config, "Chỉ tác giả đề xuất hoặc chủ phòng mới được áp dụng")
      }
      if (proposal.status !== "open") {
        conflict(config, "Đề xuất đã được áp dụng hoặc đã bị bỏ")
      }

      proposal.status = "applied"
      room.filter = applyMockProposalToFilter(room.filter, proposal)
      return { room: toRoomDto(room), summary: describeMockProposal(proposal) }
    },
  },
  {
    method: "post",
    pattern: /^\/rooms\/([^/]+)\/proposals\/([^/]+)\/dismiss$/,
    handler: (config, [code, proposalId]) => {
      const room = db.rooms.find((item) => item.code === code.toUpperCase())
      if (!room) notFound(config, "Không tìm thấy phòng")
      const actor = resolveMockRoomActor(config, room)
      const proposal = room.proposals.find((item) => item.id === proposalId)
      if (!proposal) notFound(config, "Không tìm thấy đề xuất")

      const isOwner = actor.userId !== null && actor.userId === CURRENT_USER.id
      if (proposal.memberId !== actor.id && !isOwner) {
        forbidden(config, "Chỉ tác giả đề xuất hoặc chủ phòng mới được bỏ qua")
      }
      if (proposal.status !== "open") {
        conflict(config, "Đề xuất đã được áp dụng hoặc đã bị bỏ")
      }

      proposal.status = "dismissed"
      return toRoomDto(room)
    },
  },
  {
    method: "delete",
    pattern: /^\/rooms\/([^/]+)\/members\/([^/]+)$/,
    handler: (config, [code, memberId]) => {
      const room = db.rooms.find((item) => item.code === code.toUpperCase())
      if (!room) notFound(config, "Không tìm thấy phòng")
      const actor = resolveMockRoomActor(config, room)
      const target = room.members.find((item) => item.id === memberId)
      if (!target) forbidden(config, "Bạn không ở trong phòng này")

      const isOwner = actor.userId !== null && actor.userId === CURRENT_USER.id
      if (actor.id !== target.id && !isOwner) {
        forbidden(config, "Chỉ chủ phòng mới được cho người khác rời phòng")
      }

      room.members = room.members.filter((item) => item.id !== target.id)
      room.proposals = room.proposals.filter((item) => item.memberId !== target.id)
      // Mô phỏng xoá cookie khi chính mình rời phòng.
      if (actor.id === target.id) delete db.roomTokens[room.code]
      return toRoomDto(room)
    },
  },

  // -------------------------------------------------------------------------
  // Vận hành /system — demo số liệu của PHIÊN mock (không phải backend thật).
  // -------------------------------------------------------------------------
]
