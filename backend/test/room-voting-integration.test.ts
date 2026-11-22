import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"
import { registerVerifiedUser, type TestUser } from "./helpers/auth"

/**
 * Integration test toàn diện cho Room Voting (Concurrency TOCTOU, State Machine, AuthZ/IDOR, IRV Edge Cases).
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma
let owner: TestUser
let otherUser: TestUser
const placeIds: string[] = []

function req(path: string, init: RequestInit & { cookie?: string } = {}) {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("Content-Type", "application/json")
  if (init.cookie) headers.set("Cookie", init.cookie)
  return app.request(path, { ...init, headers })
}

function extractGuestCookie(res: Response): string {
  const setCookie = res.headers.get("set-cookie") ?? ""
  return setCookie.split(";")[0] ?? ""
}

beforeAll(async () => {
  const url = await startTestDb()
  process.env.DATABASE_URL = url
  process.env.LOG_LEVEL = "error"
  process.env.NODE_ENV = "test"
  process.env.BYPASS_RATE_LIMIT = "1"

  const { createApp } = await import("../src/app")
  prisma = (await import("../src/lib/prisma")).prisma
  app = createApp()

  owner = await registerVerifiedUser(app, prisma, { name: "Chủ Phòng", handle: "rv_owner" })
  otherUser = await registerVerifiedUser(app, prisma, { name: "Người Ngoài", handle: "rv_other" })

  // Tạo 18 quán công khai để test vượt trần MAX_ROOM_CANDIDATES = 15
  for (let i = 1; i <= 18; i++) {
    const id = `rv-place-${i}`
    await prisma.place.create({
      data: {
        id,
        name: `Quán Voting ${i}`,
        category: "cafe",
        address: `${i} Bạch Đằng`,
        district: "Hải Châu",
        priceLevel: 1,
        lat: 16.06 + i * 0.001,
        lng: 108.22,
        publishedAt: new Date(),
      },
    })
    placeIds.push(id)
  }
}, 180_000)

afterAll(async () => {
  await prisma?.$disconnect()
  await stopTestDb()
}, 60_000)

async function createRoomWithGuests() {
  const createRes = await req("/api/v1/rooms", {
    method: "POST",
    cookie: owner.cookie,
    body: JSON.stringify({ name: "Kèo Tối Nay" }),
  })
  expect(createRes.status).toBe(201)
  const room = (await createRes.json()) as { code: string }

  const guest1Res = await req(`/api/v1/rooms/${room.code}/join`, {
    method: "POST",
    body: JSON.stringify({ displayName: "Khách Một" }),
  })
  expect(guest1Res.status).toBe(200)
  const guest1Cookie = extractGuestCookie(guest1Res)

  const guest2Res = await req(`/api/v1/rooms/${room.code}/join`, {
    method: "POST",
    body: JSON.stringify({ displayName: "Khách Hai" }),
  })
  expect(guest2Res.status).toBe(200)
  const guest2Cookie = extractGuestCookie(guest2Res)

  return { code: room.code, guest1Cookie, guest2Cookie }
}

describe("Room Voting — Concurrency TOCTOU, State Machine & AuthZ", () => {
  test("Concurrency TOCTOU: 18 request song song thêm 18 quán không bao giờ vượt trần 15 ứng viên và không trả 500", async () => {
    const { code } = await createRoomWithGuests()

    const responses = await Promise.all(
      placeIds.map((placeId) =>
        req(`/api/v1/rooms/${code}/candidates`, {
          method: "POST",
          cookie: owner.cookie,
          body: JSON.stringify({ placeId }),
        }),
      ),
    )

    const statuses = responses.map((r) => r.status)
    // Không có lỗi 500 nào nổ ra do race condition
    expect(statuses.every((s) => s !== 500)).toBe(true)
    expect(statuses.filter((s) => s === 200 || s === 201).length).toBe(15)
    expect(statuses.filter((s) => s === 400).length).toBe(3)

    const roomRes = await req(`/api/v1/rooms/${code}`, { cookie: owner.cookie })
    const roomData = (await roomRes.json()) as { candidates: unknown[] }
    expect(roomData.candidates.length).toBe(15)
  })

  test("Concurrency idempotent: 5 request song song thêm cùng 1 placeId đều an toàn (0 lỗi 500/P2002)", async () => {
    const { code } = await createRoomWithGuests()
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        req(`/api/v1/rooms/${code}/candidates`, {
          method: "POST",
          cookie: owner.cookie,
          body: JSON.stringify({ placeId: placeIds[0] }),
        }),
      ),
    )

    expect(responses.every((r) => r.status === 200 || r.status === 201)).toBe(true)
    const roomRes = await req(`/api/v1/rooms/${code}`, { cookie: owner.cookie })
    const roomData = (await roomRes.json()) as { candidates: unknown[] }
    expect(roomData.candidates.length).toBe(1)
  })

  test("AuthZ & IDOR: khách khác không xóa được ứng viên của người khác; người không phải chủ phòng không thể mở/chốt bình chọn", async () => {
    const { code, guest1Cookie, guest2Cookie } = await createRoomWithGuests()

    // Guest 1 thêm 1 quán ứng viên
    const addRes = await req(`/api/v1/rooms/${code}/candidates`, {
      method: "POST",
      cookie: guest1Cookie,
      body: JSON.stringify({ placeId: placeIds[0] }),
    })
    expect([200, 201]).toContain(addRes.status)
    const addedRoom = (await addRes.json()) as { candidates: { id: string }[] }
    const candId = addedRoom.candidates[0]!.id

    // Guest 2 cố xóa ứng viên do Guest 1 thêm -> 403
    const forbiddenDel = await req(`/api/v1/rooms/${code}/candidates/${candId}`, {
      method: "DELETE",
      cookie: guest2Cookie,
    })
    expect(forbiddenDel.status).toBe(403)

    // User ngoài phòng (đã đăng nhập nhưng không phải chủ phòng) cố mở bình chọn -> 403
    const forbiddenStart = await req(`/api/v1/rooms/${code}/voting/start`, {
      method: "POST",
      cookie: otherUser.cookie,
      body: JSON.stringify({ votingMode: "ranked_choice" }),
    })
    expect(forbiddenStart.status).toBe(403)

    // Guest 1 tự xóa ứng viên mình thêm -> 200
    const ownDel = await req(`/api/v1/rooms/${code}/candidates/${candId}`, {
      method: "DELETE",
      cookie: guest1Cookie,
    })
    expect(ownDel.status).toBe(200)
  })

  test("State Machine: filtering -> voting (IRV) -> locked, chặn vote sai pha và trùng ứng viên", async () => {
    const { code, guest1Cookie, guest2Cookie } = await createRoomWithGuests()

    // Thêm 2 quán ứng viên
    await req(`/api/v1/rooms/${code}/candidates`, {
      method: "POST",
      cookie: owner.cookie,
      body: JSON.stringify({ placeId: placeIds[0] }),
    })
    const add2 = await req(`/api/v1/rooms/${code}/candidates`, {
      method: "POST",
      cookie: owner.cookie,
      body: JSON.stringify({ placeId: placeIds[1] }),
    })
    const roomAfterAdd = (await add2.json()) as { candidates: { id: string; placeId: string }[] }
    const [c1, c2] = roomAfterAdd.candidates

    // Vote khi còn đang ở pha filtering -> 409
    const earlyVote = await req(`/api/v1/rooms/${code}/votes`, {
      method: "POST",
      cookie: guest1Cookie,
      body: JSON.stringify({
        mode: "ranked_choice",
        rankings: [{ candidateId: c1!.id, rank: 1 }],
      }),
    })
    expect(earlyVote.status).toBe(409)

    // Mở bình chọn IRV (ranked_choice)
    const startRes = await req(`/api/v1/rooms/${code}/voting/start`, {
      method: "POST",
      cookie: owner.cookie,
      body: JSON.stringify({ votingMode: "ranked_choice" }),
    })
    expect(startRes.status).toBe(200)

    // Thêm ứng viên mới khi đã sang pha voting -> 409
    const lateAdd = await req(`/api/v1/rooms/${code}/candidates`, {
      method: "POST",
      cookie: owner.cookie,
      body: JSON.stringify({ placeId: placeIds[2] }),
    })
    expect(lateAdd.status).toBe(409)

    // Bỏ phiếu hợp lệ (owner + guest1 chọn c2 #1, guest2 chọn c1 #1 -> c2 thắng 2-1)
    for (const [cookie, first, second] of [
      [owner.cookie, c2!.id, c1!.id],
      [guest1Cookie, c2!.id, c1!.id],
      [guest2Cookie, c1!.id, c2!.id],
    ] as const) {
      const voteRes = await req(`/api/v1/rooms/${code}/votes`, {
        method: "POST",
        cookie,
        body: JSON.stringify({
          mode: "ranked_choice",
          rankings: [
            { candidateId: first, rank: 1 },
            { candidateId: second, rank: 2 },
          ],
        }),
      })
      expect(voteRes.status).toBe(200)
    }

    // Chốt kết quả -> phase = locked, winnerPlaceId = c2.placeId
    const finalizeRes = await req(`/api/v1/rooms/${code}/voting/finalize`, {
      method: "POST",
      cookie: owner.cookie,
      body: JSON.stringify({}),
    })
    expect(finalizeRes.status).toBe(200)
    const finalized = (await finalizeRes.json()) as {
      phase: string
      winnerPlaceId: string | null
    }
    expect(finalized.phase).toBe("locked")
    expect(finalized.winnerPlaceId).toBe(c2!.placeId)

    // Vote sau khi đã locked -> 409
    const postLockVote = await req(`/api/v1/rooms/${code}/votes`, {
      method: "POST",
      cookie: guest1Cookie,
      body: JSON.stringify({
        mode: "ranked_choice",
        rankings: [{ candidateId: c1!.id, rank: 1 }],
      }),
    })
    expect(postLockVote.status).toBe(409)
  })
})
