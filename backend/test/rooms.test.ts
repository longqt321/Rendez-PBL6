import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { roomSchema, appliedProposalSchema } from "@rendez/schema"
import { startTestDb, stopTestDb } from "./helpers/pg"

/**
 * Integration test Phase 6 — phòng lọc nhóm trên Postgres thật.
 *
 * Kiểm tạo phòng (mã 6 ký tự đúng alphabet), guest join không cần tài khoản
 * (D5), đề xuất include/exclude áp vào filter đúng quy tắc port từ frontend,
 * quyền của thành viên, rời phòng xoá kèm đề xuất, và SSE đẩy trạng thái mới.
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

describe("phòng lọc nhóm", () => {
  let ownerCookie = ""
  let code = ""
  let ownerMemberId = ""
  let guestMemberId = ""

  beforeAll(async () => {
    ownerCookie = await register("Chủ Phòng", `room_owner_${suffix}`)
  })

  test("POST /rooms cần đăng nhập", async () => {
    const res = await call("/api/v1/rooms", { method: "POST", body: JSON.stringify({}) })
    expect(res.status).toBe(401)
  })

  test("POST /rooms tạo phòng, mã 6 ký tự đúng alphabet", async () => {
    const res = await call("/api/v1/rooms", {
      method: "POST",
      cookie: ownerCookie,
      body: JSON.stringify({ name: "Ăn tối nhóm" }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as unknown
    expect(roomSchema.safeParse(body).success).toBe(true)
    const room = body as {
      code: string
      name: string
      members: Array<{ id: string; isMe: boolean }>
    }
    expect(room.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
    expect(room.name).toBe("Ăn tối nhóm")
    expect(room.members).toHaveLength(1)
    expect(room.members[0]!.isMe).toBe(true)
    code = room.code
    ownerMemberId = room.members[0]!.id
  })

  test("GET /rooms/:code 404 với mã sai, 200 với mã đúng", async () => {
    expect((await call("/api/v1/rooms/ZZZZZZ")).status).toBe(404)
    expect((await call("/api/v1/rooms/abc")).status).toBe(404)

    const res = await call(`/api/v1/rooms/${code}`, { cookie: ownerCookie })
    expect(res.status).toBe(200)
    const body = (await res.json()) as unknown
    expect(roomSchema.safeParse(body).success).toBe(true)
  })

  test("guest join không cần tài khoản, idempotent theo tên", async () => {
    const join = await call(`/api/v1/rooms/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ displayName: "Minh" }),
    })
    expect(join.status).toBe(200)
    const body = (await join.json()) as {
      room: { members: Array<{ id: string; isMe: boolean }> }
      memberId: string
      joined: boolean
    }
    expect(body.joined).toBe(true)
    expect(body.room.members).toHaveLength(2)
    expect(body.room.members.find((member) => member.id === body.memberId)?.isMe).toBe(true)
    guestMemberId = body.memberId

    // Cùng tên → không thêm thành viên mới.
    const again = await call(`/api/v1/rooms/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ displayName: "minh" }),
    })
    const againBody = (await again.json()) as { joined: boolean; memberId: string }
    expect(againBody.joined).toBe(false)
    expect(againBody.memberId).toBe(guestMemberId)

    const empty = await call(`/api/v1/rooms/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ displayName: "   " }),
    })
    expect(empty.status).toBe(400)
  })

  test("đề xuất cần là thành viên của phòng", async () => {
    const stranger = await call(`/api/v1/rooms/${code}/proposals`, {
      method: "POST",
      body: JSON.stringify({
        memberId: "00000000-0000-4000-8000-000000000000",
        kind: "include",
        field: "category",
        value: "cafe",
      }),
    })
    expect(stranger.status).toBe(403)
  })

  test("áp đề xuất include/exclude đúng quy tắc filter", async () => {
    const add = async (payload: Record<string, unknown>) => {
      const res = await call(`/api/v1/rooms/${code}/proposals`, {
        method: "POST",
        body: JSON.stringify({ memberId: guestMemberId, ...payload }),
      })
      expect(res.status).toBe(201)
      const body = (await res.json()) as unknown
      expect(roomSchema.safeParse(body).success).toBe(true)
      return body as {
        proposals: Array<{ id: string; status: string }>
        filter: Record<string, unknown>
      }
    }

    // 1. include cafe
    const afterInclude = await add({ kind: "include", field: "category", value: "cafe" })
    const includeProposal = afterInclude.proposals[0]!
    expect(includeProposal.status).toBe("open")

    const apply = await call(
      `/api/v1/rooms/${code}/proposals/${includeProposal.id}/apply?memberId=${guestMemberId}`,
      { method: "POST" },
    )
    expect(apply.status).toBe(200)
    const applied = (await apply.json()) as unknown
    expect(appliedProposalSchema.safeParse(applied).success).toBe(true)
    const appliedBody = applied as {
      room: { filter: { categories: string[] }; proposals: Array<{ status: string }> }
      summary: string
    }
    expect(appliedBody.room.filter.categories).toEqual(["cafe"])
    expect(appliedBody.room.proposals[0]!.status).toBe("applied")
    expect(appliedBody.summary).toBe("＋ Loại hình: Cà phê")

    // 2. exclude cafe → bỏ khỏi include, thêm vào exclude
    const afterExclude = await add({ kind: "exclude", field: "category", value: "cafe" })
    const excludeProposal = afterExclude.proposals[0]!
    const applyExclude = await call(
      `/api/v1/rooms/${code}/proposals/${excludeProposal.id}/apply?memberId=${guestMemberId}`,
      { method: "POST" },
    )
    const excludeBody = (await applyExclude.json()) as {
      room: { filter: { categories: string[]; excludedCategories: string[] } }
    }
    expect(excludeBody.room.filter.categories).toEqual([])
    expect(excludeBody.room.filter.excludedCategories).toEqual(["cafe"])

    // 3. priceMax include "2"
    const afterPrice = await add({ kind: "include", field: "priceMax", value: "2" })
    const priceProposal = afterPrice.proposals[0]!
    const applyPrice = await call(
      `/api/v1/rooms/${code}/proposals/${priceProposal.id}/apply?memberId=${guestMemberId}`,
      { method: "POST" },
    )
    const priceBody = (await applyPrice.json()) as { room: { filter: { priceMax?: number } } }
    expect(priceBody.room.filter.priceMax).toBe(2)

    // 4. keyword include/exclude
    const afterKeyword = await add({ kind: "include", field: "keyword", value: "hải sản" })
    const keywordProposal = afterKeyword.proposals[0]!
    await call(
      `/api/v1/rooms/${code}/proposals/${keywordProposal.id}/apply?memberId=${guestMemberId}`,
      {
        method: "POST",
      },
    )
    const afterExcludeKeyword = await add({ kind: "exclude", field: "keyword", value: "chay" })
    const excludeKeyword = afterExcludeKeyword.proposals[0]!
    const applyExcludeKeyword = await call(
      `/api/v1/rooms/${code}/proposals/${excludeKeyword.id}/apply?memberId=${guestMemberId}`,
      { method: "POST" },
    )
    const keywordBody = (await applyExcludeKeyword.json()) as {
      room: { filter: { includeKeywords: string[]; excludeKeywords: string[] } }
    }
    expect(keywordBody.room.filter.includeKeywords).toEqual(["hải sản"])
    expect(keywordBody.room.filter.excludeKeywords).toEqual(["chay"])
  })

  test("áp/dismiss đề xuất đã xử lý → 400", async () => {
    const room = (await (await call(`/api/v1/rooms/${code}`)).json()) as {
      proposals: Array<{ id: string; status: string }>
    }
    const applied = room.proposals.find((item) => item.status === "applied")!
    const res = await call(
      `/api/v1/rooms/${code}/proposals/${applied.id}/apply?memberId=${guestMemberId}`,
      { method: "POST" },
    )
    expect(res.status).toBe(400)
  })

  test("dismiss đề xuất mở → status dismissed, filter không đổi", async () => {
    const add = await call(`/api/v1/rooms/${code}/proposals`, {
      method: "POST",
      body: JSON.stringify({
        memberId: guestMemberId,
        kind: "include",
        field: "district",
        value: "Hải Châu",
      }),
    })
    const created = (await add.json()) as { proposals: Array<{ id: string }>; filter: unknown }
    const proposalId = created.proposals[0]!.id

    const dismiss = await call(
      `/api/v1/rooms/${code}/proposals/${proposalId}/dismiss?memberId=${guestMemberId}`,
      { method: "POST" },
    )
    expect(dismiss.status).toBe(200)
    const body = (await dismiss.json()) as {
      proposals: Array<{ id: string; status: string }>
      filter: { districts: string[] }
    }
    expect(body.proposals.find((item) => item.id === proposalId)?.status).toBe("dismissed")
    expect(body.filter.districts).toEqual([])
  })

  test("rời phòng xoá thành viên và đề xuất của họ", async () => {
    const before = (await (await call(`/api/v1/rooms/${code}`)).json()) as {
      proposals: Array<{ memberId: string }>
    }
    expect(before.proposals.some((item) => item.memberId === guestMemberId)).toBe(true)

    const leave = await call(`/api/v1/rooms/${code}/members/${guestMemberId}`, { method: "DELETE" })
    expect(leave.status).toBe(200)
    const body = (await leave.json()) as {
      members: Array<{ id: string }>
      proposals: Array<{ memberId: string }>
    }
    expect(body.members.some((member) => member.id === guestMemberId)).toBe(false)
    expect(body.proposals.some((item) => item.memberId === guestMemberId)).toBe(false)

    // Rời lần nữa → 403 (không còn là thành viên).
    const again = await call(`/api/v1/rooms/${code}/members/${guestMemberId}`, { method: "DELETE" })
    expect(again.status).toBe(403)
  })

  test("SSE đẩy trạng thái phòng khi có thay đổi", async () => {
    const controller = new AbortController()
    const res = await app.request(`/api/v1/rooms/${code}/events?memberId=${ownerMemberId}`, {
      signal: controller.signal,
    })
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/event-stream")

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()

    // Sự kiện đầu tiên là trạng thái hiện tại.
    const first = await reader.read()
    const firstText = decoder.decode(first.value)
    expect(firstText).toContain("event: room")
    const initial = JSON.parse(firstText.split("data: ")[1]!.split("\n")[0]!) as { code: string }
    expect(initial.code).toBe(code)

    // Mutation từ client khác → SSE đẩy trạng thái mới.
    await call(`/api/v1/rooms/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ displayName: "Lan" }),
    })

    const second = await reader.read()
    const secondText = decoder.decode(second.value)
    expect(secondText).toContain("event: room")
    const updated = JSON.parse(secondText.split("data: ")[1]!.split("\n")[0]!) as {
      members: Array<{ displayName: string }>
    }
    expect(updated.members.some((member) => member.displayName === "Lan")).toBe(true)

    controller.abort()
  })
})
