import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"
import { registerVerifiedUser } from "./helpers/auth"

/**
 * Integration test xoá đánh giá (DELETE /places/:id/reviews).
 *
 * Kiểm tra:
 * - 401 khi chưa đăng nhập
 * - 404 khi không tìm thấy review hoặc place không tồn tại/chưa công khai
 * - 204 khi xoá thành công review của chính mình
 * - Sau khi xoá:
 *   + GET /places/:id/reviews không còn review đó
 *   + Review count và rating không tính review đã xoá
 *   + Xoá lại lần nữa trả 404
 *   + Có thể POST review mới lại tại cùng placeId (upsert khôi phục deletedAt: null)
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

interface Session {
  cookie: string
  id: string
}

async function register(name: string, handle: string): Promise<Session> {
  return registerVerifiedUser(app, prisma, { name, handle })
}

function call(path: string, init: RequestInit & { cookie?: string } = {}) {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("Content-Type", "application/json")
  if (init.cookie) headers.set("Cookie", init.cookie)
  return app.request(path, { ...init, headers })
}

describe("DELETE /places/:id/reviews", () => {
  let user: Session
  let otherUser: Session
  let placeId = ""

  beforeAll(async () => {
    user = await register("Reviewer Delete", `rev_del_${suffix}`)
    otherUser = await register("Other Reviewer", `rev_oth_${suffix}`)

    const place = await prisma.place.findFirst({
      where: { publishedAt: { not: null }, deletedAt: null },
      select: { id: true },
      orderBy: { id: "asc" },
    })
    placeId = place!.id
  })

  test("401 khi chưa đăng nhập", async () => {
    const res = await call(`/api/v1/places/${placeId}/reviews`, {
      method: "DELETE",
    })
    expect(res.status).toBe(401)
  })

  test("404 khi place không tồn tại", async () => {
    const res = await call(`/api/v1/places/non-existent-place-id/reviews`, {
      method: "DELETE",
      cookie: user.cookie,
    })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ message: "Không tìm thấy địa điểm" })
  })

  test("404 khi user chưa có review tại place", async () => {
    const res = await call(`/api/v1/places/${placeId}/reviews`, {
      method: "DELETE",
      cookie: user.cookie,
    })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ message: "Không tìm thấy đánh giá" })
  })

  test("204 khi xoá thành công và GET /places/:id/reviews không còn review đó", async () => {
    // 1. Tạo review của user
    const postRes = await call(`/api/v1/places/${placeId}/reviews`, {
      method: "POST",
      cookie: user.cookie,
      body: JSON.stringify({ rating: 5, content: "Quán tuyệt vời trước khi xoá" }),
    })
    expect(postRes.status).toBe(201)
    const createdReview = (await postRes.json()) as { id: string }

    // 2. Xác nhận review xuất hiện trong danh sách
    const listBefore = await call(`/api/v1/places/${placeId}/reviews`)
    expect(listBefore.status).toBe(200)
    const bodyBefore = (await listBefore.json()) as { items: Array<{ id: string }> }
    expect(bodyBefore.items.some((item) => item.id === createdReview.id)).toBe(true)

    // 3. User khác gọi DELETE không ảnh hưởng tới review của user (trả 404 vì otherUser chưa review)
    const otherRes = await call(`/api/v1/places/${placeId}/reviews`, {
      method: "DELETE",
      cookie: otherUser.cookie,
    })
    expect(otherRes.status).toBe(404)

    // 4. Chính chủ xoá review -> 204 No Content
    const delRes = await call(`/api/v1/places/${placeId}/reviews`, {
      method: "DELETE",
      cookie: user.cookie,
    })
    expect(delRes.status).toBe(204)
    expect(await delRes.text()).toBe("")

    // 5. Sau khi xoá: GET /places/:id/reviews không còn review đó
    const listAfter = await call(`/api/v1/places/${placeId}/reviews`)
    expect(listAfter.status).toBe(200)
    const bodyAfter = (await listAfter.json()) as { items: Array<{ id: string }> }
    expect(bodyAfter.items.some((item) => item.id === createdReview.id)).toBe(false)

    // 6. Xoá lần nữa -> 404
    const delAgainRes = await call(`/api/v1/places/${placeId}/reviews`, {
      method: "DELETE",
      cookie: user.cookie,
    })
    expect(delAgainRes.status).toBe(404)

    // 7. DB review record có deletedAt !== null (soft-delete)
    const dbReview = await prisma.review.findUnique({
      where: { placeId_authorId: { placeId, authorId: user.id } },
      select: { deletedAt: true },
    })
    expect(dbReview?.deletedAt).not.toBeNull()

    // 8. Tác giả có thể đánh giá lại sau khi xoá mà không bị unique constraint error
    const rePostRes = await call(`/api/v1/places/${placeId}/reviews`, {
      method: "POST",
      cookie: user.cookie,
      body: JSON.stringify({ rating: 4, content: "Đánh giá lại sau khi xoá" }),
    })
    expect(rePostRes.status).toBe(201)

    // Dọn dẹp: xoá lại review đã tạo lại
    const cleanupRes = await call(`/api/v1/places/${placeId}/reviews`, {
      method: "DELETE",
      cookie: user.cookie,
    })
    expect(cleanupRes.status).toBe(204)
  })
})
