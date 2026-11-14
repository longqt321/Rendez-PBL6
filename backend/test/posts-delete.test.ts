import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"
import { registerVerifiedUser } from "./helpers/auth"

/**
 * Integration test xoá bài đăng (DELETE /posts/:id) + limit bình luận.
 *
 * Kiểm: chủ xoá → 204 và dữ liệu liên quan sạch (cascade DB + thông báo
 * payload postId), người khác xoá → 403, id lạ → 404, `?limit` của
 * GET /posts/:id/comments (mặc định 50, trần 100, số lạ bỏ qua).
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma

/** Hậu tố ngẫu nhiên — các file test dùng chung một container. */
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

async function createPost(cookie: string, caption: string): Promise<string> {
  const res = await call("/api/v1/posts", {
    method: "POST",
    cookie,
    body: JSON.stringify({ caption }),
  })
  expect(res.status).toBe(201)
  return ((await res.json()) as { id: string }).id
}

describe("DELETE /posts/:id", () => {
  let author: Session
  let other: Session
  let postId = ""

  beforeAll(async () => {
    author = await register("Chủ Bài", `xoa_bai_${suffix}`)
    other = await register("Người Khác", `xoa_khac_${suffix}`)
    postId = await createPost(author.cookie, "Bài sẽ bị xoá")
  })

  test("id không tồn tại trả 404", async () => {
    const res = await call(`/api/v1/posts/00000000-0000-4000-8000-000000000000`, {
      method: "DELETE",
      cookie: author.cookie,
    })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ message: "Không tìm thấy bài đăng" })
  })

  test("người khác xoá trả 403, bài vẫn còn", async () => {
    const res = await call(`/api/v1/posts/${postId}`, {
      method: "DELETE",
      cookie: other.cookie,
    })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ message: "Không phải bài đăng của bạn" })

    // Bài không bị xoá oan.
    const stillThere = await call(`/api/v1/posts/${postId}`)
    expect(stillThere.status).toBe(200)
  })

  test("chủ xoá → 204, dữ liệu liên quan sạch", async () => {
    // Dựng dữ liệu liên quan đầy đủ trước khi xoá.
    await call(`/api/v1/posts/${postId}/like`, {
      method: "PATCH",
      cookie: other.cookie,
      body: JSON.stringify({ liked: true }),
    })
    await call(`/api/v1/posts/${postId}/save`, {
      method: "PATCH",
      cookie: other.cookie,
      body: JSON.stringify({ saved: true }),
    })
    const commentRes = await call(`/api/v1/posts/${postId}/comments`, {
      method: "POST",
      cookie: other.cookie,
      body: JSON.stringify({ body: "Bình luận sẽ bị xoá theo bài" }),
    })
    const commentId = ((await commentRes.json()) as { id: string }).id
    await call(`/api/v1/comments/${commentId}/like`, {
      method: "PATCH",
      cookie: author.cookie,
      body: JSON.stringify({ liked: true }),
    })
    // Ảnh bài đăng không qua route (cần R2) — insert thẳng để kiểm cascade.
    await prisma.postImage.create({
      data: { postId, url: `https://cdn.rendez.test/posts/${postId}/a.jpg`, position: 0 },
    })

    const res = await call(`/api/v1/posts/${postId}`, {
      method: "DELETE",
      cookie: author.cookie,
    })
    expect(res.status).toBe(204)

    // Bài và toàn bộ dữ liệu phụ thuộc đã biến mất.
    expect(await prisma.post.count({ where: { id: postId } })).toBe(0)
    expect(await prisma.postImage.count({ where: { postId } })).toBe(0)
    expect(await prisma.postLike.count({ where: { postId } })).toBe(0)
    expect(await prisma.postSave.count({ where: { postId } })).toBe(0)
    expect(await prisma.comment.count({ where: { postId } })).toBe(0)
    expect(await prisma.commentLike.count({ where: { commentId } })).toBe(0)

    // Thông báo trỏ bài qua payload JSONB (không FK) phải được xoá tay.
    expect(
      await prisma.notification.count({
        where: { payload: { path: ["postId"], equals: postId } },
      }),
    ).toBe(0)

    // GET sau xoá → 404.
    expect((await call(`/api/v1/posts/${postId}`)).status).toBe(404)
  })
})

describe("GET /posts/:id/comments?limit", () => {
  let author: Session
  let postId = ""

  beforeAll(async () => {
    author = await register("Chủ Limit", `limit_chu_${suffix}`)
    postId = await createPost(author.cookie, "Bài nhiều bình luận")

    // COMMENT_RATE_LIMIT chặn 10 bình luận/phút/user → chia đều cho 11 user
    // (register giới hạn 20 user/phút/IP nên 11 user nằm trong ngưỡng).
    const commenters: Session[] = []
    for (let i = 0; i < 11; i++) {
      commenters.push(await register(`Bình ${i}`, `limit_binh_${suffix}_${i}`))
    }
    for (let i = 0; i < 110; i++) {
      const res = await call(`/api/v1/posts/${postId}/comments`, {
        method: "POST",
        cookie: commenters[i % commenters.length]!.cookie,
        body: JSON.stringify({ body: `Bình luận số ${i}` }),
      })
      expect(res.status).toBe(201)
    }
  }, 180_000)

  test("mặc định 50 khi không gửi limit", async () => {
    const res = await call(`/api/v1/posts/${postId}/comments`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: unknown[] }
    expect(body.items.length).toBe(50)
  })

  test("limit=100 trả đủ 100", async () => {
    const res = await call(`/api/v1/posts/${postId}/comments?limit=100`)
    const body = (await res.json()) as { items: unknown[] }
    expect(body.items.length).toBe(100)
  })

  test("limit vượt trần bị kẹp về 100", async () => {
    const res = await call(`/api/v1/posts/${postId}/comments?limit=150`)
    const body = (await res.json()) as { items: unknown[] }
    expect(body.items.length).toBe(100)
  })

  test("limit=abc bỏ qua, dùng mặc định 50", async () => {
    const res = await call(`/api/v1/posts/${postId}/comments?limit=abc`)
    const body = (await res.json()) as { items: unknown[] }
    expect(body.items.length).toBe(50)
  })
})
