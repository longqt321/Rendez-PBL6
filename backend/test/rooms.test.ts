import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { appliedProposalSchema, roomSchema } from "@rendez/schema"
import { startTestDb, stopTestDb } from "./helpers/pg"

/**
 * Integration test Phase 6 — phòng lọc nhóm trên Postgres thật.
 *
 * Hợp đồng bảo mật (D-056/D-057): guest token trong cookie HttpOnly theo phòng
 * (DB chỉ lưu HMAC), trùng tên không token → 409, mọi mutation xác thực actor
 * từ session/cookie (không đọc memberId/actorId từ query/body), CAS apply
 * (song song chỉ một thắng), SSE chỉ phát `{version}` trung tính.
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma

const suffix = Math.random().toString(36).slice(2, 8)

beforeAll(async () => {
  const url = await startTestDb()
  process.env.DATABASE_URL = url
  process.env.LOG_LEVEL = "error"
  process.env.NODE_ENV = "test"

  const { createApp } = await import("../src/app")
  prisma = (await import("../src/lib/prisma")).prisma
  app = createApp()
}, 180_000)

afterAll(async () => {
  await prisma?.$disconnect()
  await stopTestDb()
}, 60_000)

async function register(name: string, handle: string): Promise<string> {
  const res = await app.request("/api/v1/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email: `${handle}@rendez.test`, password: "password123", handle }),
  })
  expect(res.status).toBe(201)
  return (res.headers.getSetCookie()[0] ?? "").split(";")[0] ?? ""
}

function call(path: string, init: RequestInit & { cookie?: string } = {}) {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("Content-Type", "application/json")
  if (init.cookie) headers.set("Cookie", init.cookie)
  return app.request(path, { ...init, headers })
}

interface RoomBody {
  code: string
  name: string
  members: Array<{ id: string; displayName: string; isMe: boolean }>
  proposals: Array<{ id: string; memberId: string; status: string; value: string }>
  filter: Record<string, unknown>
}

interface JoinBody {
  room: RoomBody
  memberId: string
  joined: boolean
  guestToken?: string
}

/** Lấy cookie `rendez_room_<code>` từ response join/create. */
function roomCookie(res: Response, code: string): string {
  const raw = res.headers.getSetCookie().find((cookie) => cookie.startsWith(`rendez_room_${code}=`))
  expect(raw).toBeDefined()
  return raw!.split(";")[0] ?? ""
}

describe("phòng lọc nhóm", () => {
  let ownerCookie = ""
  let code = ""
  let guestMemberId = ""
  let guestCookie = ""

  beforeAll(async () => {
    ownerCookie = await register("Chủ Phòng", `room_owner_${suffix}`)
  })

  test("POST /rooms cần đăng nhập", async () => {
    const res = await call("/api/v1/rooms", { method: "POST", body: JSON.stringify({}) })
    expect(res.status).toBe(401)
  })

  test("POST /rooms: tên tuỳ chọn (rỗng vẫn tạo được), quá 80 ký tự trả 400", async () => {
    const empty = await call("/api/v1/rooms", {
      method: "POST",
      cookie: ownerCookie,
      body: JSON.stringify({ name: "  " }),
    })
    expect(empty.status).toBe(201)

    const tooLong = await call("/api/v1/rooms", {
      method: "POST",
      cookie: ownerCookie,
      body: JSON.stringify({ name: "x".repeat(81) }),
    })
    expect(tooLong.status).toBe(400)
  })

  test("POST /rooms tạo phòng, mã base32 Crockford 6 ký tự, cookie token được gắn", async () => {
    const res = await call("/api/v1/rooms", {
      method: "POST",
      cookie: ownerCookie,
      body: JSON.stringify({ name: "Ăn tối nhóm" }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as unknown
    expect(roomSchema.safeParse(body).success).toBe(true)
    const room = body as RoomBody & { guestToken?: string }
    expect(room.code).toMatch(/^[0-9A-HJKMNP-TV-Z]{6}$/u)
    expect(room.name).toBe("Ăn tối nhóm")
    expect(room.members).toHaveLength(1)
    expect(room.members[0]!.isMe).toBe(true)
    expect(typeof room.guestToken).toBe("string")
    code = room.code

    // Cookie HttpOnly theo phòng, không lộ token qua JS.
    const cookie = roomCookie(res, code)
    expect(cookie).toContain(`rendez_room_${code}=`)
  })

  test("GET /rooms/:code 404 với mã sai, 200 với mã đúng", async () => {
    expect((await call("/api/v1/rooms/ZZZZZZ")).status).toBe(404)
    expect((await call("/api/v1/rooms/abc")).status).toBe(404)

    const res = await call(`/api/v1/rooms/${code}`, { cookie: ownerCookie })
    expect(res.status).toBe(200)
    const body = (await res.json()) as unknown
    expect(roomSchema.safeParse(body).success).toBe(true)
  })

  test("guest GET phòng không thấy isMe (không có token/session)", async () => {
    const res = await call(`/api/v1/rooms/${code}`)
    const body = (await res.json()) as RoomBody
    expect(body.members.every((member) => member.isMe === false)).toBe(true)
  })

  test("guest join không cần tài khoản, nhận token đúng một lần", async () => {
    const join = await call(`/api/v1/rooms/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ displayName: "Minh" }),
    })
    expect(join.status).toBe(200)
    const body = (await join.json()) as JoinBody
    expect(body.joined).toBe(true)
    expect(typeof body.guestToken).toBe("string")
    expect(body.room.members).toHaveLength(2)
    expect(body.room.members.find((member) => member.id === body.memberId)?.isMe).toBe(true)
    guestMemberId = body.memberId
    guestCookie = roomCookie(join, code)

    // Join lại với token (cookie) → cùng thành viên, không tạo mới.
    const again = await call(`/api/v1/rooms/${code}/join`, {
      method: "POST",
      cookie: guestCookie,
      body: JSON.stringify({ displayName: "Minh khác tên" }),
    })
    expect(again.status).toBe(200)
    const againBody = (await again.json()) as JoinBody
    expect(againBody.joined).toBe(false)
    expect(againBody.memberId).toBe(guestMemberId)
    expect(againBody.guestToken).toBeUndefined()

    const empty = await call(`/api/v1/rooms/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ displayName: "   " }),
    })
    expect(empty.status).toBe(400)
  })

  test("join trùng tên KHÔNG có token → 409 (chặn mạo danh qua tên công khai)", async () => {
    const res = await call(`/api/v1/rooms/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ displayName: "minh" }),
    })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ message: "Tên này đã có người dùng trong phòng" })
  })

  test("đề xuất: không token → 403, token giả → 403", async () => {
    const noAuth = await call(`/api/v1/rooms/${code}/proposals`, {
      method: "POST",
      body: JSON.stringify({ kind: "include", field: "category", value: "cafe" }),
    })
    expect(noAuth.status).toBe(403)

    const fake = await call(`/api/v1/rooms/${code}/proposals`, {
      method: "POST",
      cookie: `rendez_room_${code}=token-gia`,
      body: JSON.stringify({ kind: "include", field: "category", value: "cafe" }),
    })
    expect(fake.status).toBe(403)
  })

  test("đề xuất thiếu field/kind trả 400", async () => {
    const bad = await call(`/api/v1/rooms/${code}/proposals`, {
      method: "POST",
      cookie: guestCookie,
      body: JSON.stringify({}),
    })
    expect(bad.status).toBe(400)
  })

  test("đề xuất giá trị không hợp lệ trả 400, không lưu rác vào filter", async () => {
    // Trước đây `value` tự do đi thẳng vào filter JSONB: `category=hack` làm
    // `toApiCategory` ném lỗi ở lần GET phòng kế tiếp → phòng hỏng vĩnh viễn (500).
    const badCategory = await call(`/api/v1/rooms/${code}/proposals`, {
      method: "POST",
      cookie: guestCookie,
      body: JSON.stringify({ kind: "include", field: "category", value: "hack" }),
    })
    expect(badCategory.status).toBe(400)
    expect(await badCategory.json()).toEqual({ message: "Giá trị đề xuất không hợp lệ" })

    const badPrice = await call(`/api/v1/rooms/${code}/proposals`, {
      method: "POST",
      cookie: guestCookie,
      body: JSON.stringify({ kind: "include", field: "priceMax", value: "9" }),
    })
    expect(badPrice.status).toBe(400)

    // Giá trị dạng Prisma (`street_food`) được chuẩn hoá về dạng API.
    const normalized = await call(`/api/v1/rooms/${code}/proposals`, {
      method: "POST",
      cookie: guestCookie,
      body: JSON.stringify({ kind: "include", field: "category", value: "street_food" }),
    })
    expect(normalized.status).toBe(201)
    const body = (await normalized.json()) as RoomBody
    expect(body.proposals[0]?.value).toBe("street-food")

    // Phòng vẫn đọc được bình thường sau các đề xuất trên.
    expect((await call(`/api/v1/rooms/${code}`)).status).toBe(200)
  })

  test("áp đề xuất include/exclude đúng quy tắc filter", async () => {
    const add = async (payload: Record<string, unknown>) => {
      const res = await call(`/api/v1/rooms/${code}/proposals`, {
        method: "POST",
        cookie: guestCookie,
        body: JSON.stringify(payload),
      })
      expect(res.status).toBe(201)
      const body = (await res.json()) as unknown
      expect(roomSchema.safeParse(body).success).toBe(true)
      return body as RoomBody
    }

    // 1. include cafe
    const afterInclude = await add({ kind: "include", field: "category", value: "cafe" })
    const includeProposal = afterInclude.proposals[0]!
    expect(includeProposal.status).toBe("open")

    const apply = await call(`/api/v1/rooms/${code}/proposals/${includeProposal.id}/apply`, {
      method: "POST",
      cookie: guestCookie,
    })
    expect(apply.status).toBe(200)
    const applied = (await apply.json()) as unknown
    expect(appliedProposalSchema.safeParse(applied).success).toBe(true)
    const appliedBody = applied as {
      room: RoomBody
      summary: string
    }
    expect(appliedBody.room.filter.categories).toEqual(["cafe"])
    expect(appliedBody.room.proposals[0]!.status).toBe("applied")
    expect(appliedBody.summary).toBe("＋ Loại hình: Cà phê")

    // 2. exclude cafe → bỏ khỏi include, thêm vào exclude
    const afterExclude = await add({ kind: "exclude", field: "category", value: "cafe" })
    const excludeProposal = afterExclude.proposals[0]!
    const applyExclude = await call(`/api/v1/rooms/${code}/proposals/${excludeProposal.id}/apply`, {
      method: "POST",
      cookie: guestCookie,
    })
    const excludeBody = (await applyExclude.json()) as {
      room: RoomBody
    }
    expect(excludeBody.room.filter.categories).toEqual([])
    expect(excludeBody.room.filter.excludedCategories).toEqual(["cafe"])

    // 3. priceMax chỉ áp cho include
    const afterPrice = await add({ kind: "include", field: "priceMax", value: "2" })
    const applyPrice = await call(
      `/api/v1/rooms/${code}/proposals/${afterPrice.proposals[0]!.id}/apply`,
      { method: "POST", cookie: guestCookie },
    )
    const priceBody = (await applyPrice.json()) as { room: RoomBody }
    expect(priceBody.room.filter.priceMax).toBe(2)

    // 4. keyword exclude
    const afterKeyword = await add({ kind: "exclude", field: "keyword", value: "chay" })
    const applyKeyword = await call(
      `/api/v1/rooms/${code}/proposals/${afterKeyword.proposals[0]!.id}/apply`,
      { method: "POST", cookie: guestCookie },
    )
    const keywordBody = (await applyKeyword.json()) as { room: RoomBody }
    expect(keywordBody.room.filter.excludeKeywords).toEqual(["chay"])
  })

  test("áp đề xuất đã xử lý → 409 (CAS)", async () => {
    const room = (await (await call(`/api/v1/rooms/${code}`)).json()) as RoomBody
    const applied = room.proposals.find((item) => item.status === "applied")!
    const res = await call(`/api/v1/rooms/${code}/proposals/${applied.id}/apply`, {
      method: "POST",
      cookie: guestCookie,
    })
    expect(res.status).toBe(409)
  })

  test("người ngoài (không tác giả, không chủ phòng) không apply/dismiss được", async () => {
    // Guest thứ hai vào phòng.
    const joined = await call(`/api/v1/rooms/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ displayName: `Khách phụ ${suffix}` }),
    })
    const second = (await joined.json()) as JoinBody
    const secondCookie = roomCookie(joined, code)

    const open = (await (await call(`/api/v1/rooms/${code}`)).json()) as RoomBody
    const openProposal = open.proposals.find((item) => item.status === "open")!

    const applyOther = await call(`/api/v1/rooms/${code}/proposals/${openProposal.id}/apply`, {
      method: "POST",
      cookie: secondCookie,
    })
    expect(applyOther.status).toBe(403)

    const dismissOther = await call(`/api/v1/rooms/${code}/proposals/${openProposal.id}/dismiss`, {
      method: "POST",
      cookie: secondCookie,
    })
    expect(dismissOther.status).toBe(403)

    // Chủ phòng (session) vẫn apply được đề xuất của guest.
    const byOwner = await call(`/api/v1/rooms/${code}/proposals/${openProposal.id}/apply`, {
      method: "POST",
      cookie: ownerCookie,
    })
    expect(byOwner.status).toBe(200)
    expect(second.memberId.length).toBeGreaterThan(0)
  })

  test("apply 2 request song song → đúng 1 thành công, 1 nhận 409", async () => {
    const add = await call(`/api/v1/rooms/${code}/proposals`, {
      method: "POST",
      cookie: guestCookie,
      body: JSON.stringify({ kind: "include", field: "district", value: "Hải Châu" }),
    })
    const proposal = ((await add.json()) as RoomBody).proposals[0]!

    const [first, second] = await Promise.all([
      call(`/api/v1/rooms/${code}/proposals/${proposal.id}/apply`, {
        method: "POST",
        cookie: guestCookie,
      }),
      call(`/api/v1/rooms/${code}/proposals/${proposal.id}/apply`, {
        method: "POST",
        cookie: guestCookie,
      }),
    ])
    const statuses = [first.status, second.status].sort((a, b) => a - b)
    expect(statuses).toEqual([200, 409])
  })

  test("dismiss đề xuất mở → status dismissed, filter không đổi", async () => {
    const before = (await (await call(`/api/v1/rooms/${code}`)).json()) as RoomBody
    const add = await call(`/api/v1/rooms/${code}/proposals`, {
      method: "POST",
      cookie: guestCookie,
      body: JSON.stringify({ kind: "include", field: "district", value: "Sơn Trà" }),
    })
    const created = (await add.json()) as RoomBody
    const proposalId = created.proposals[0]!.id

    const dismiss = await call(`/api/v1/rooms/${code}/proposals/${proposalId}/dismiss`, {
      method: "POST",
      cookie: guestCookie,
    })
    expect(dismiss.status).toBe(200)
    const body = (await dismiss.json()) as RoomBody
    expect(body.proposals.find((item) => item.id === proposalId)?.status).toBe("dismissed")
    // Dismiss không đụng filter — so với filter ngay trước khi dismiss.
    expect(body.filter.districts).toEqual(before.filter.districts)
  })

  test("rời phòng xoá thành viên và đề xuất của họ, xoá cookie", async () => {
    const before = (await (await call(`/api/v1/rooms/${code}`)).json()) as RoomBody
    expect(before.proposals.some((item) => item.memberId === guestMemberId)).toBe(true)

    const leave = await call(`/api/v1/rooms/${code}/members/${guestMemberId}`, {
      method: "DELETE",
      cookie: guestCookie,
    })
    expect(leave.status).toBe(200)
    const body = (await leave.json()) as RoomBody
    expect(body.members.some((member) => member.id === guestMemberId)).toBe(false)
    expect(body.proposals.some((item) => item.memberId === guestMemberId)).toBe(false)

    // Cookie bị xoá (Max-Age=0).
    const cleared = leave.headers.getSetCookie().find((c) => c.startsWith(`rendez_room_${code}=`))
    expect(cleared).toContain("Max-Age=0")

    // Rời lần nữa → 403 (token đã bị dọn, không còn là thành viên).
    const again = await call(`/api/v1/rooms/${code}/members/${guestMemberId}`, {
      method: "DELETE",
      cookie: guestCookie,
    })
    expect(again.status).toBe(403)
  })

  test("thành viên thường không xoá được người khác, chủ phòng thì được", async () => {
    // Hai khách mới vào phòng — khách A không được xoá khách B.
    const joinedA = await call(`/api/v1/rooms/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ displayName: `Khách A ${suffix}` }),
    })
    expect(joinedA.status).toBe(200)
    const cookieA = roomCookie(joinedA, code)

    const joinedB = await call(`/api/v1/rooms/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ displayName: `Khách B ${suffix}` }),
    })
    expect(joinedB.status).toBe(200)
    const guestBId = ((await joinedB.json()) as JoinBody).memberId

    // Khách A (không phải chủ phòng) xoá khách B → 403.
    const forbidden = await call(`/api/v1/rooms/${code}/members/${guestBId}`, {
      method: "DELETE",
      cookie: cookieA,
    })
    expect(forbidden.status).toBe(403)

    // Chủ phòng xoá được.
    const byOwner = await call(`/api/v1/rooms/${code}/members/${guestBId}`, {
      method: "DELETE",
      cookie: ownerCookie,
    })
    expect(byOwner.status).toBe(200)
  })

  test("SSE chỉ phát room-updated + version (không isMe/token/memberId)", async () => {
    const controller = new AbortController()
    const res = await app.request(`/api/v1/rooms/${code}/events`, {
      signal: controller.signal,
    })
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/event-stream")

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()

    const readEvent = async (): Promise<{ event: string; data: string }> => {
      let buffer = ""
      while (true) {
        const chunk = await reader.read()
        buffer += decoder.decode(chunk.value ?? new Uint8Array())
        const match = buffer.match(/event: (.+)\ndata: (.+)\n/u)
        if (match) return { event: match[1]!, data: match[2]! }
      }
    }

    // Sự kiện đầu là version hiện tại.
    const first = await readEvent()
    expect(first.event).toBe("room-updated")
    const initial = JSON.parse(first.data) as { version: number }
    expect(typeof initial.version).toBe("number")
    expect(first.data).not.toContain("isMe")
    expect(first.data).not.toContain("memberId")
    expect(first.data).not.toContain("token")

    // Mutation từ client khác → SSE đẩy version mới.
    await call(`/api/v1/rooms/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ displayName: "Lan" }),
    })

    const second = await readEvent()
    expect(second.event).toBe("room-updated")
    const updated = JSON.parse(second.data) as { version: number }
    expect(updated.version).toBeGreaterThan(initial.version)

    controller.abort()
  })

  test("rate limit join theo IP → 429 kèm Retry-After sau ngưỡng", async () => {
    // Phòng riêng để không làm bẩn phòng chính.
    const created = await call("/api/v1/rooms", {
      method: "POST",
      cookie: ownerCookie,
      body: JSON.stringify({ name: "Rate limit" }),
    })
    const fresh = ((await created.json()) as RoomBody & { guestToken?: string }).code

    let saw429 = false
    for (let attempt = 0; attempt < 30; attempt++) {
      const res = await call(`/api/v1/rooms/${fresh}/join`, {
        method: "POST",
        body: JSON.stringify({ displayName: `Khách ${attempt}` }),
      })
      if (res.status === 429) {
        saw429 = true
        expect(res.headers.get("Retry-After")).toBeDefined()
        break
      }
    }
    expect(saw429).toBe(true)
  })
})
