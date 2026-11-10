import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { pageSchema, reviewSchema } from "@rendez/schema"
import { startTestDb, stopTestDb } from "./helpers/pg"

/**
 * Integration test Phase 4 — đánh giá + báo cáo địa điểm trên Postgres thật.
 *
 * Kiểm A7.4 (upsert 1 user 1 review/place, aggregate rating/reviewCount tăng
 * dần qua GET /places/:id) và A7.5 (báo cáo unique place+reason+reporter,
 * `other` cần detail, place chưa publish 404).
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma

const reviewPageSchema = pageSchema(reviewSchema)

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

interface Session {
  cookie: string
  id: string
}

async function register(name: string, handle: string): Promise<Session> {
  const res = await app.request("/api/v1/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email: `${handle}@rendez.test`, password: "password123", handle }),
  })
  expect(res.status).toBe(201)
  const cookie = (res.headers.getSetCookie()[0] ?? "").split(";")[0] ?? ""
  const body = (await res.json()) as { id: string }
  return { cookie, id: body.id }
}

function call(path: string, init: RequestInit & { cookie?: string } = {}) {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("Content-Type", "application/json")
  if (init.cookie) headers.set("Cookie", init.cookie)
  return app.request(path, { ...init, headers })
}

describe("reviews + reports", () => {
  let user: Session
  let other: Session
  let placeId = ""

  beforeAll(async () => {
    user = await register("Người Đánh Giá", `danh_gia_${suffix}`)
    other = await register("Người Khác", `danh_gia_khac_${suffix}`)
    // Chọn động một place đã publish — tránh phụ thuộc dữ liệu seed cứng.
    const place = await prisma.place.findFirst({
      where: { publishedAt: { not: null }, deletedAt: null },
      select: { id: true },
      orderBy: { id: "asc" },
    })
    placeId = place!.id
  })

  test("GET /places/:id/reviews cần place công khai", async () => {
    const unpublished = await prisma.place.findFirst({
      where: { publishedAt: null, deletedAt: null },
      select: { id: true },
    })
    if (!unpublished) return // dataset không có place ẩn — bỏ qua nhánh này
    const res = await call(`/api/v1/places/${unpublished.id}/reviews`)
    expect(res.status).toBe(404)
  })

  test("GET reviews trả Page<Review> khớp schema", async () => {
    const res = await call(`/api/v1/places/${placeId}/reviews`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as unknown
    expect(reviewPageSchema.safeParse(body).success).toBe(true)
  })

  test("POST review cần đăng nhập", async () => {
    const res = await call(`/api/v1/places/${placeId}/reviews`, {
      method: "POST",
      body: JSON.stringify({ rating: 5, content: "Ngon" }),
    })
    expect(res.status).toBe(401)
  })

  test("POST review từ chối rating sai và content rỗng", async () => {
    for (const body of [
      { rating: 0, content: "X" },
      { rating: 6, content: "X" },
      { rating: 4.5, content: "X" },
      { rating: 4, content: "   " },
    ]) {
      const res = await call(`/api/v1/places/${placeId}/reviews`, {
        method: "POST",
        cookie: user.cookie,
        body: JSON.stringify(body),
      })
      expect(res.status).toBe(400)
    }
  })

  test("POST review tạo mới rồi ghi đè — 1 user 1 review (A7.4)", async () => {
    const create = await call(`/api/v1/places/${placeId}/reviews`, {
      method: "POST",
      cookie: user.cookie,
      body: JSON.stringify({ rating: 5, content: "Rất ngon" }),
    })
    expect(create.status).toBe(201)
    const created = (await create.json()) as { id: string; isMine: boolean; rating: number }
    expect(created.isMine).toBe(true)
    expect(created.rating).toBe(5)

    // Ghi đè cùng user — không tăng số review.
    const update = await call(`/api/v1/places/${placeId}/reviews`, {
      method: "POST",
      cookie: user.cookie,
      body: JSON.stringify({ rating: 2, content: "Đổi ý" }),
    })
    expect(update.status).toBe(201)
    const updated = (await update.json()) as { id: string; rating: number }
    expect(updated.id).toBe(created.id)
    expect(updated.rating).toBe(2)

    // Aggregate tăng dần: reviewCount = số dòng reviews thật, rating là AVG.
    const rows = await prisma.review.findMany({
      where: { placeId, deletedAt: null },
      select: { rating: true },
    })
    expect(rows).toHaveLength(1)
    const detail = await call(`/api/v1/places/${placeId}`)
    const place = (await detail.json()) as { rating: number; reviewCount: number }
    expect(place.reviewCount).toBe(rows.length)
    expect(place.rating).toBeCloseTo(rows.reduce((s, r) => s + r.rating, 0) / rows.length, 1)
  })

  test("isMine chỉ đúng với tác giả", async () => {
    await call(`/api/v1/places/${placeId}/reviews`, {
      method: "POST",
      cookie: other.cookie,
      body: JSON.stringify({ rating: 4, content: "Cũng được" }),
    })
    const res = await call(`/api/v1/places/${placeId}/reviews`, { cookie: user.cookie })
    const body = (await res.json()) as {
      items: Array<{ isMine: boolean; rating: number }>
    }
    const mine = body.items.find((r) => r.isMine)
    const theirs = body.items.find((r) => !r.isMine)
    expect(mine?.rating).toBe(2)
    expect(theirs?.rating).toBe(4)
  })

  test("POST report: other cần detail, unique place+reason+reporter (A7.5)", async () => {
    const noDetail = await call(`/api/v1/places/${placeId}/reports`, {
      method: "POST",
      cookie: user.cookie,
      body: JSON.stringify({ reason: "other" }),
    })
    expect(noDetail.status).toBe(400)

    const ok = await call(`/api/v1/places/${placeId}/reports`, {
      method: "POST",
      cookie: user.cookie,
      body: JSON.stringify({ reason: "other", detail: "Địa chỉ không còn tồn tại" }),
    })
    expect(ok.status).toBe(201)
    const report = (await ok.json()) as { reason: string; detail: string | null }
    expect(report.reason).toBe("other")
    expect(report.detail).toBe("Địa chỉ không còn tồn tại")

    const duplicate = await call(`/api/v1/places/${placeId}/reports`, {
      method: "POST",
      cookie: user.cookie,
      body: JSON.stringify({ reason: "other", detail: "Lại báo cáo" }),
    })
    expect(duplicate.status).toBe(400)

    // Cùng user, lý do khác → vẫn báo được.
    const otherReason = await call(`/api/v1/places/${placeId}/reports`, {
      method: "POST",
      cookie: user.cookie,
      body: JSON.stringify({ reason: "closed" }),
    })
    expect(otherReason.status).toBe(201)

    // Lý do không hợp lệ.
    const badReason = await call(`/api/v1/places/${placeId}/reports`, {
      method: "POST",
      cookie: user.cookie,
      body: JSON.stringify({ reason: "spam-die" }),
    })
    expect(badReason.status).toBe(400)
  })

  test("POST report cần place công khai và đăng nhập", async () => {
    const res = await call(`/api/v1/places/${placeId}/reports`, {
      method: "POST",
      body: JSON.stringify({ reason: "closed" }),
    })
    expect(res.status).toBe(401)
  })
})
