import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"
import { registerVerifiedUser, type TestUser } from "./helpers/auth"

/**
 * Integration test IDOR & BVA cho /me/anchors và /me/location (mã hoá AES-GCM theo userId).
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma
let userA: TestUser
let userB: TestUser

function req(path: string, init: RequestInit = {}, cookie?: string) {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("Content-Type", "application/json")
  if (cookie) headers.set("Cookie", cookie)
  return app.request(path, { ...init, headers })
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

  userA = await registerVerifiedUser(app, prisma, { name: "Loc User A", handle: "loc_idor_a" })
  userB = await registerVerifiedUser(app, prisma, { name: "Loc User B", handle: "loc_idor_b" })
}, 180_000)

afterAll(async () => {
  await prisma?.$disconnect()
  await stopTestDb()
}, 60_000)

describe("Location Anchors & Synced Location — IDOR & Boundary Cases", () => {
  test("IDOR: User B không thể sửa hoặc xoá mốc vị trí (anchor) của User A", async () => {
    const createRes = await req(
      "/api/v1/me/anchors",
      {
        method: "POST",
        body: JSON.stringify({
          kind: "home",
          label: "Nhà A",
          lat: 16.0544,
          lng: 108.2022,
        }),
      },
      userA.cookie,
    )
    expect(createRes.status).toBe(201)
    const { anchor: created } = (await createRes.json()) as { anchor: { id: string } }

    // User B cố PATCH anchor của User A -> 404 (không lộ sự tồn tại)
    const patchByB = await req(
      `/api/v1/me/anchors/${created.id}`,
      { method: "PATCH", body: JSON.stringify({ label: "Bị chiếm" }) },
      userB.cookie,
    )
    expect([403, 404]).toContain(patchByB.status)

    // User B cố DELETE anchor của User A -> 404
    const delByB = await req(`/api/v1/me/anchors/${created.id}`, { method: "DELETE" }, userB.cookie)
    expect([403, 404]).toContain(delByB.status)

    // ID không phải UUID hợp lệ -> 400
    const badId = await req("/api/v1/me/anchors/not-a-uuid", { method: "DELETE" }, userA.cookie)
    expect(badId.status).toBe(400)

    // Xác nhận anchor của A vẫn nguyên vẹn
    const listA = await req("/api/v1/me/anchors", {}, userA.cookie)
    expect(listA.status).toBe(200)
    const listBody = (await listA.json()) as { items: { id: string; label: string }[] }
    expect(listBody.items.find((a) => a.id === created.id)?.label).toBe("Nhà A")
  })

  test("BVA: /me/location PUT/GET/DELETE cô lập hoàn toàn giữa User A và User B, chặn tọa độ & accuracy ngoài biên", async () => {
    // Tọa độ ngoài biên và accuracy ngoài biên (0, 1001) -> 400
    expect(
      (
        await req(
          "/api/v1/me/location",
          { method: "PUT", body: JSON.stringify({ lat: 200, lng: 108.2, accuracy: 25 }) },
          userA.cookie,
        )
      ).status,
    ).toBe(400)
    expect(
      (
        await req(
          "/api/v1/me/location",
          { method: "PUT", body: JSON.stringify({ lat: 16.06, lng: 108.22, accuracy: 1001 }) },
          userA.cookie,
        )
      ).status,
    ).toBe(400)

    // User A lưu vị trí hợp lệ
    const putA = await req(
      "/api/v1/me/location",
      { method: "PUT", body: JSON.stringify({ lat: 16.061, lng: 108.221, accuracy: 25 }) },
      userA.cookie,
    )
    expect(putA.status).toBe(200)

    // User A đọc lại đúng tọa độ; User B không thấy tọa độ của A
    const getA = await req("/api/v1/me/location", {}, userA.cookie)
    expect(getA.status).toBe(200)
    const locA = (await getA.json()) as { location: { lat: number; lng: number } | null }
    expect(locA.location?.lat).toBeCloseTo(16.061, 3)

    const getB = await req("/api/v1/me/location", {}, userB.cookie)
    expect(getB.status).toBe(200)
    const locB = (await getB.json()) as { location: unknown }
    expect(locB.location).toBeNull()

    // Xóa vị trí của A -> GET trả null
    expect((await req("/api/v1/me/location", { method: "DELETE" }, userA.cookie)).status).toBe(200)
    const getAfterDel = await req("/api/v1/me/location", {}, userA.cookie)
    const afterDelBody = (await getAfterDel.json()) as { location: unknown }
    expect(afterDelBody.location).toBeNull()
  })
})
