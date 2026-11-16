import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"
import { registerVerifiedUser } from "./helpers/auth"

/**
 * Backend Test Suite: Decision Table (Bảng quyết định phân quyền Room)
 *
 * Kiểm thử toàn bộ ma trận phân quyền:
 * - Owner (Chủ phòng): Quyền tuyệt đối (đổi tên, apply/dismiss đề xuất, đá thành viên).
 * - Proposer (Người tạo đề xuất): Có thể apply đề xuất của chính mình.
 * - Non-Owner Member: Không được apply đề xuất của người khác (403), không được đá thành viên khác (403).
 * - Stranger / Non-member: Không gửi được đề xuất (403), không mở SSE (403).
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma

const suffix = Math.random().toString(36).slice(2, 8)

beforeAll(async () => {
  const url = await startTestDb()
  process.env.DATABASE_URL = url
  process.env.LOG_LEVEL = "error"
  process.env.NODE_ENV = "test"
  process.env.BYPASS_RATE_LIMIT = "1"

  const { createApp } = await import("../src/app")
  prisma = (await import("../src/lib/prisma")).prisma
  app = createApp()
}, 180_000)

afterAll(async () => {
  await prisma?.$disconnect()
  await stopTestDb()
}, 60_000)

async function register(name: string, handle: string): Promise<string> {
  return (await registerVerifiedUser(app, prisma, { name, handle })).cookie
}

function call(path: string, init: RequestInit & { cookie?: string } = {}) {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("Content-Type", "application/json")
  if (init.cookie) headers.set("Cookie", init.cookie)
  return app.request(path, { ...init, headers })
}

function roomCookie(res: Response, code: string): string {
  const raw = res.headers.getSetCookie().find((cookie) => cookie.startsWith(`rendez_room_${code}=`))
  expect(raw).toBeDefined()
  return raw!.split(";")[0] ?? ""
}

describe("Room Permission Matrix — Decision Table (Bảng quyết định)", () => {
  let ownerCookie: string
  let guestCookieA: string
  let guestCookieB: string
  let roomCode: string
  let guestBId: string

  beforeAll(async () => {
    ownerCookie = await register("Chủ Phòng DT", `owner_dt_${suffix}`)

    // 1. Owner tạo phòng
    const createRes = await call("/api/v1/rooms", {
      method: "POST",
      cookie: ownerCookie,
      body: JSON.stringify({ name: "Phòng Quyết Định" }),
    })
    expect(createRes.status).toBe(201)
    const room = (await createRes.json()) as { code: string }
    roomCode = room.code

    // 2. Guest A join phòng
    const joinA = await call(`/api/v1/rooms/${roomCode}/join`, {
      method: "POST",
      body: JSON.stringify({ displayName: `Khách A ${suffix}` }),
    })
    expect(joinA.status).toBe(200)
    guestCookieA = roomCookie(joinA, roomCode)

    // 3. Guest B join phòng
    const joinB = await call(`/api/v1/rooms/${roomCode}/join`, {
      method: "POST",
      body: JSON.stringify({ displayName: `Khách B ${suffix}` }),
    })
    expect(joinB.status).toBe(200)
    const bodyB = (await joinB.json()) as { memberId: string }
    guestBId = bodyB.memberId
    guestCookieB = roomCookie(joinB, roomCode)
  })

  describe("Hành động: Gửi đề xuất quán/bộ lọc (Propose filter)", () => {
    test("DT-P1: Owner gửi đề xuất category → 201", async () => {
      const res = await call(`/api/v1/rooms/${roomCode}/proposals`, {
        method: "POST",
        cookie: ownerCookie,
        body: JSON.stringify({
          kind: "include",
          field: "category",
          value: "cafe",
        }),
      })
      expect(res.status).toBe(201)
    })

    test("DT-P2: Member (Guest A) gửi đề xuất category → 201", async () => {
      const res = await call(`/api/v1/rooms/${roomCode}/proposals`, {
        method: "POST",
        cookie: guestCookieA,
        body: JSON.stringify({
          kind: "include",
          field: "district",
          value: "Hải Châu",
        }),
      })
      expect(res.status).toBe(201)
    })

    test("DT-P3: Người ngoài không có cookie phòng bị chặn gửi đề xuất → 403", async () => {
      const res = await call(`/api/v1/rooms/${roomCode}/proposals`, {
        method: "POST",
        body: JSON.stringify({
          kind: "include",
          field: "category",
          value: "cafe",
        }),
      })
      expect(res.status).toBe(403)
    })
  })

  describe("Hành động: Áp dụng đề xuất (Apply proposal)", () => {
    let proposalAId: string

    beforeAll(async () => {
      const roomRes = await call(`/api/v1/rooms/${roomCode}`)
      const room = (await roomRes.json()) as { proposals: { id: string; field: string }[] }
      const propA = room.proposals.find((p) => p.field === "district")
      expect(propA).toBeDefined()
      proposalAId = propA!.id
    })

    test("DT-A1: Guest B (không phải người tạo, không phải chủ phòng) apply đề xuất của A → 403", async () => {
      const res = await call(`/api/v1/rooms/${roomCode}/proposals/${proposalAId}/apply`, {
        method: "POST",
        cookie: guestCookieB,
      })
      expect(res.status).toBe(403)
    })

    test("DT-A2: Chủ phòng (Owner) apply đề xuất của Guest A → 200", async () => {
      const res = await call(`/api/v1/rooms/${roomCode}/proposals/${proposalAId}/apply`, {
        method: "POST",
        cookie: ownerCookie,
      })
      expect(res.status).toBe(200)
    })
  })

  describe("Hành động: Quản trị thành viên (Kick member)", () => {
    test("DT-M1: Guest A (không phải chủ phòng) đòi đá Guest B → 403", async () => {
      const res = await call(`/api/v1/rooms/${roomCode}/members/${guestBId}`, {
        method: "DELETE",
        cookie: guestCookieA,
      })
      expect(res.status).toBe(403)
    })

    test("DT-M2: Chủ phòng (Owner) đá Guest B → 200", async () => {
      const res = await call(`/api/v1/rooms/${roomCode}/members/${guestBId}`, {
        method: "DELETE",
        cookie: ownerCookie,
      })
      expect(res.status).toBe(200)
    })
  })

  describe("Hành động: SSE Stream bảo mật", () => {
    test("DT-S1: Thành viên phòng (Guest A) mở SSE → 200", async () => {
      const res = await call(`/api/v1/rooms/${roomCode}/events`, {
        cookie: guestCookieA,
      })
      expect(res.status).toBe(200)
    })

    test("DT-S2: Người ngoài không có cookie mở SSE → 403", async () => {
      const res = await call(`/api/v1/rooms/${roomCode}/events`)
      expect(res.status).toBe(403)
    })
  })
})
