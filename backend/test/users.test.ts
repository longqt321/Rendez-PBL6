import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { pageSchema, userProfileSchema } from "@rendez/schema"
import { startTestDb, stopTestDb } from "./helpers/pg"

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

  test("q không khớp ai trả trang rỗng", async () => {
    const res = await app.request("/api/v1/users?q=zzz-khong-co")
    const body = (await res.json()) as { items: unknown[]; next: string | null }
    expect(body.items).toHaveLength(0)
    expect(body.next).toBeNull()
  })
})
