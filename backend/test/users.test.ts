import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { pageSchema, userProfileSchema } from "@rendez/schema"
import { startTestDb, stopTestDb } from "./helpers/pg"
import { registerVerifiedUser } from "./helpers/auth"

/**
 * Integration test T2.6 — `GET /users?q=` tìm không dấu, trả `Page<UserProfile>`.
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma

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

const userPageSchema = pageSchema(userProfileSchema)

/** Hậu tố ngẫu nhiên — các file test dùng chung một container. */
const suffix = Math.random().toString(36).slice(2, 8)

describe("GET /users", () => {
  test("trả Page<UserProfile> khớp schema", async () => {
    const res = await app.request("/api/v1/users")
    expect(res.status).toBe(200)
    expect(userPageSchema.safeParse(await res.json()).success).toBe(true)
  })

  test("tìm không dấu khớp tên có dấu", async () => {
    // Tạo user có tên có dấu để tìm.
    await app.request("/api/v1/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Minh Anh",
        email: `minhanh-${suffix}@rendez.test`,
        password: "password123",
        handle: `minh_anh_${suffix}`,
      }),
    })

    const res = await app.request("/api/v1/users?q=minh anh")
    const body = (await res.json()) as {
      items: { name: string; handle: string; isMe: boolean }[]
      next: string | null
    }

    expect(userPageSchema.safeParse(body).success).toBe(true)
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).toMatchObject({
      name: "Minh Anh",
      handle: `minh_anh_${suffix}`,
      isMe: false,
    })
  })

  test("tìm có dấu vẫn khớp (chuẩn hoá 2 phía như mock)", async () => {
    await app.request("/api/v1/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": `10.9.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`,
      },
      body: JSON.stringify({
        name: "Ngọc Ánh",
        email: `ngocanh-${suffix}@rendez.test`,
        password: "password123",
        handle: `ngoc_anh_${suffix}`,
      }),
    })

    const res = await app.request(`/api/v1/users?q=${encodeURIComponent("ngọc ánh")}`)
    const body = (await res.json()) as { items: { name: string }[] }

    expect(body.items.map((item) => item.name)).toContain("Ngọc Ánh")
  })

  test("q không khớp ai trả trang rỗng", async () => {
    const res = await app.request("/api/v1/users?q=zzz-khong-co")
    const body = (await res.json()) as { items: unknown[]; next: string | null }
    expect(body.items).toHaveLength(0)
    expect(body.next).toBeNull()
  })

  test("cursor keyset: trang sau chỉ gồm người cũ hơn mốc cursor", async () => {
    // Dựng cursor từ dữ liệu thật (không tạo thêm user — route đăng ký có rate limit).
    const rows = await prisma.$queryRaw<{ id: string; created_at: Date }[]>`
      SELECT id, created_at FROM users ORDER BY created_at DESC, id DESC LIMIT 5
    `
    expect(rows.length).toBeGreaterThan(0)
    const pivot = rows[rows.length - 1]!
    const cursor = Buffer.from(`${pivot.created_at.toISOString()}|${pivot.id}`, "utf8").toString(
      "base64url",
    )

    const res = await app.request(`/api/v1/users?cursor=${cursor}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      items: { id: string; createdAt: string }[]
      next: string | null
    }
    expect(userPageSchema.safeParse(body).success).toBe(true)
    for (const item of body.items) {
      expect(item.id).not.toBe(pivot.id)
      expect(new Date(item.createdAt).getTime()).toBeLessThanOrEqual(pivot.created_at.getTime())
    }
  })

  test("đăng nhập rồi tìm: isMe đúng cho chính mình", async () => {
    // IP riêng để không đụng rate limit đăng ký của các test trước.
    const { cookie } = await registerVerifiedUser(app, prisma, {
      name: "Tôi Tìm Kiếm",
      email: `me_search_${suffix}@rendez.test`,
      handle: `me_search_${suffix}`,
      headers: { "X-Forwarded-For": "10.77.0.9" },
    })

    const res = await app.request(`/api/v1/users?q=me_search_${suffix}`, {
      headers: { Cookie: cookie },
    })
    const body = (await res.json()) as { items: { handle: string; isMe: boolean }[] }
    expect(body.items).toHaveLength(1)
    expect(body.items[0]?.isMe).toBe(true)
  })
})
