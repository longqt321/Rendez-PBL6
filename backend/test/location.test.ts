import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"
import { registerVerifiedUser } from "./helpers/auth"

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

describe("Location anchors, landmarks & synced GPS", () => {
  test("GET /landmarks trả về danh sách địa danh công khai của thành phố", async () => {
    const res = await app.request("/api/v1/landmarks")
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: Array<{ slug: string; name: string }> }
    expect(body.items.length).toBeGreaterThanOrEqual(3)
    const slugs = body.items.map((x) => x.slug)
    expect(slugs).toContain("cau-rong")
    expect(slugs).toContain("cau-song-han")
    expect(slugs).toContain("tuong-dai-me-nhu")
  })

  test("CRUD mốc cá nhân (/me/anchors) giữ isDefault duy nhất và giới hạn 10 mốc", async () => {
    const unauth = await app.request("/api/v1/me/anchors")
    expect(unauth.status).toBe(401)

    const userA = await registerVerifiedUser(app, prisma, {
      name: "Loc User A",
      handle: `loc_a_${suffix}`,
    })
    const userB = await registerVerifiedUser(app, prisma, {
      name: "Loc User B",
      handle: `loc_b_${suffix}`,
    })

    // Tạo mốc 1 (isDefault: true)
    const create1 = await app.request("/api/v1/me/anchors", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: userA.cookie },
      body: JSON.stringify({
        label: "Nhà riêng",
        kind: "home",
        lat: 16.0544,
        lng: 108.2022,
        isDefault: true,
      }),
    })
    expect(create1.status).toBe(201)
    const { anchor: a1 } = (await create1.json()) as { anchor: { id: string; isDefault: boolean } }
    expect(a1.isDefault).toBe(true)

    // Tạo mốc 2 (isDefault: true) -> mốc 1 tự động thành false
    const create2 = await app.request("/api/v1/me/anchors", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: userA.cookie },
      body: JSON.stringify({
        label: "Công ty",
        kind: "work",
        lat: 16.0611,
        lng: 108.2275,
        isDefault: true,
      }),
    })
    expect(create2.status).toBe(201)
    const { anchor: a2 } = (await create2.json()) as { anchor: { id: string; isDefault: boolean } }
    expect(a2.isDefault).toBe(true)

    const listRes = await app.request("/api/v1/me/anchors", {
      headers: { cookie: userA.cookie },
    })
    expect(listRes.status).toBe(200)
    const listBody = (await listRes.json()) as {
      items: Array<{ id: string; isDefault: boolean }>
    }
    expect(listBody.items).toHaveLength(2)
    expect(listBody.items.filter((i) => i.isDefault)).toHaveLength(1)
    expect(listBody.items.find((i) => i.id === a1.id)?.isDefault).toBe(false)

    // User B không thể sửa hoặc xóa mốc của User A
    const patchOther = await app.request(`/api/v1/me/anchors/${a1.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie: userB.cookie },
      body: JSON.stringify({ label: "Hack" }),
    })
    expect(patchOther.status).toBe(404)

    const delOther = await app.request(`/api/v1/me/anchors/${a1.id}`, {
      method: "DELETE",
      headers: { cookie: userB.cookie },
    })
    expect(delOther.status).toBe(404)

    // Tạo thêm 8 mốc nữa để chạm ngưỡng 10
    for (let i = 3; i <= 10; i++) {
      const r = await app.request("/api/v1/me/anchors", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: userA.cookie },
        body: JSON.stringify({ label: `Mốc ${i}`, kind: "custom", lat: 16.05, lng: 108.2 }),
      })
      expect(r.status).toBe(201)
    }

    // Mốc thứ 11 bị chặn
    const overLimit = await app.request("/api/v1/me/anchors", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: userA.cookie },
      body: JSON.stringify({ label: "Mốc 11", kind: "custom", lat: 16.05, lng: 108.2 }),
    })
    expect(overLimit.status).toBe(400)

    // Xóa mốc 1 thành công
    const delOwn = await app.request(`/api/v1/me/anchors/${a1.id}`, {
      method: "DELETE",
      headers: { cookie: userA.cookie },
    })
    expect(delOwn.status).toBe(200)
  })

  test("PUT/GET/DELETE /me/location chặn accuracy > 150m và đồng bộ chính xác", async () => {
    const user = await registerVerifiedUser(app, prisma, {
      name: "GPS User",
      handle: `gps_${suffix}`,
    })

    const bad = await app.request("/api/v1/me/location", {
      method: "PUT",
      headers: { "Content-Type": "application/json", cookie: user.cookie },
      body: JSON.stringify({ lat: 16.05, lng: 108.2, accuracy: 1500 }),
    })
    expect(bad.status).toBe(400)

    const good = await app.request("/api/v1/me/location", {
      method: "PUT",
      headers: { "Content-Type": "application/json", cookie: user.cookie },
      body: JSON.stringify({ lat: 16.0544, lng: 108.2022, accuracy: 18 }),
    })
    expect(good.status).toBe(200)

    const getRes = await app.request("/api/v1/me/location", {
      headers: { cookie: user.cookie },
    })
    expect(getRes.status).toBe(200)
    const getBody = (await getRes.json()) as {
      location: { lat: number; lng: number; accuracy: number } | null
    }
    expect(getBody.location?.lat).toBe(16.0544)
    expect(getBody.location?.lng).toBe(108.2022)
    expect(getBody.location?.accuracy).toBe(18)

    const delRes = await app.request("/api/v1/me/location", {
      method: "DELETE",
      headers: { cookie: user.cookie },
    })
    expect(delRes.status).toBe(200)

    const afterDel = await app.request("/api/v1/me/location", {
      headers: { cookie: user.cookie },
    })
    const afterBody = (await afterDel.json()) as { location: null }
    expect(afterBody.location).toBeNull()
  })

  test("Tọa độ trong DB được mã hóa AES-256-GCM gắn AAD theo userId và HMAC 1 chiều", async () => {
    const { decryptJsonForUser, hmacIdentifier } = await import("../src/lib/crypto")
    const userA = await registerVerifiedUser(app, prisma, {
      name: "Enc User A",
      handle: `enc_a_${suffix}`,
    })
    const userB = await registerVerifiedUser(app, prisma, {
      name: "Enc User B",
      handle: `enc_b_${suffix}`,
    })

    const createRes = await app.request("/api/v1/me/anchors", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: userA.cookie },
      body: JSON.stringify({
        label: "Nhà bí mật",
        kind: "home",
        lat: 16.0544,
        lng: 108.2022,
        address: "123 Đường XYZ",
      }),
    })
    expect(createRes.status).toBe(201)
    const { anchor } = (await createRes.json()) as { anchor: { id: string } }

    const rawRow = await prisma.userLocationAnchor.findUnique({ where: { id: anchor.id } })
    expect(rawRow).not.toBeNull()
    expect(rawRow!.encryptedCoords.startsWith("v1.")).toBe(true)
    expect(rawRow!.encryptedCoords).not.toContain("16.0544")
    expect(rawRow!.encryptedCoords).not.toContain("123 Đường XYZ")

    // Giải mã đúng user A thành công, sai user B trả về null
    expect(decryptJsonForUser<{ lat: number }>(userA.id, rawRow!.encryptedCoords)?.lat).toBe(
      16.0544,
    )
    expect(decryptJsonForUser(userB.id, rawRow!.encryptedCoords)).toBeNull()

    // HMAC 1 chiều không chứa userId gốc
    const hashed = hmacIdentifier("location", userA.id)
    expect(hashed).toHaveLength(64)
    expect(hashed).not.toContain(userA.id)
  })
})
