import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"
import { registerVerifiedUser } from "./helpers/auth"

/**
 * Integration test query `limit` của `GET /places/:id/reviews`.
 *
 * Mặc định 50, cap 100, parse an toàn (giá trị rác/âm về mặc định, `limit=0`
 * kẹp về 1). Review chèn thẳng qua Prisma để không phải đăng ký hàng loạt user.
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

describe("GET /places/:id/reviews?limit", () => {
  let placeId = ""

  beforeAll(async () => {
    await registerVerifiedUser(app, prisma, {
      name: "Người Limit",
      handle: `limit_chu_${suffix}`,
    })

    const place = await prisma.place.findFirst({
      where: { publishedAt: { not: null }, deletedAt: null },
      select: { id: true },
      orderBy: { id: "asc" },
    })
    placeId = place!.id

    // 3 review của 3 tác giả khác nhau, mới nhất trước theo created_at.
    const users = await prisma.user.createManyAndReturn({
      data: [1, 2, 3].map((i) => ({
        name: `Tác Giả Limit ${i}`,
        handle: `limit_tg_${i}_${suffix}`,
        email: `limit_tg_${i}_${suffix}@test.local`,
      })),
      select: { id: true },
    })
    await prisma.review.createMany({
      data: users.map((user, i) => ({
        placeId,
        authorId: user.id,
        rating: 3 + i,
        content: `Đánh giá limit ${i}`,
        createdAt: new Date(Date.now() - (users.length - i) * 60_000),
      })),
    })
  })

  function call(path: string) {
    return app.request(path)
  }

  test("mặc định trả tối đa 50, mới nhất trước", async () => {
    const res = await call(`/api/v1/places/${placeId}/reviews`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: { content: string }[] }
    expect(body.items.length).toBeLessThanOrEqual(50)
    expect(body.items[0]?.content).toBe("Đánh giá limit 2")
  })

  test("limit=2 trả đúng 2 review mới nhất", async () => {
    const res = await call(`/api/v1/places/${placeId}/reviews?limit=2`)
    const body = (await res.json()) as { items: { content: string }[] }
    expect(body.items.map((item) => item.content)).toEqual(["Đánh giá limit 2", "Đánh giá limit 1"])
  })

  test("limit vượt cap 100 bị kẹp lại", async () => {
    const res = await call(`/api/v1/places/${placeId}/reviews?limit=9999`)
    const body = (await res.json()) as { items: unknown[] }
    expect(body.items.length).toBe(3)
  })

  test("limit rác / âm / 0 không lỗi 500", async () => {
    for (const limit of ["abc", "-5", "0", "1.9"]) {
      const res = await call(`/api/v1/places/${placeId}/reviews?limit=${limit}`)
      expect(res.status).toBe(200)
      const body = (await res.json()) as { items: unknown[] }
      // "abc" về mặc định 50; âm/0/1.9 kẹp về 1.
      expect(body.items.length).toBe(limit === "abc" ? 3 : 1)
    }
  })
})
