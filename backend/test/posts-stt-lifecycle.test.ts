import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { pageSchema, postSchema } from "@rendez/schema"
import { startTestDb, stopTestDb } from "./helpers/pg"
import { registerVerifiedUser } from "./helpers/auth"

/**
 * Backend Test Suite: State Transition Testing (STT - Kiểm thử chuyển đổi trạng thái)
 *
 * Kiểm thử vòng đời bài đăng:
 * [Tạo bài đăng mới] → [Đang hiển thị trên Feed] → [IDOR Protection] → [Xóa mềm (DELETE → 204)] → [Truy cập trực tiếp trả 404]
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma

const postPageSchema = pageSchema(postSchema)
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

describe("Post Lifecycle — State Transition Testing (STT)", () => {
  let author: Session
  let otherUser: Session
  let postId: string

  beforeAll(async () => {
    author = await register("Tác Giả STT", `author_stt_${suffix}`)
    otherUser = await register("Độc Giả STT", `reader_stt_${suffix}`)
  })

  test("Trạng thái 1: Khởi tạo bài viết (Tạo mới → 201 Created)", async () => {
    const res = await call("/api/v1/posts", {
      method: "POST",
      cookie: author.cookie,
      body: JSON.stringify({
        caption: "Bài viết kiểm thử vòng đời trạng thái STT",
      }),
    })
    expect(res.status).toBe(201)
    const post = await res.json()
    expect(post.id).toBeDefined()
    expect(post.caption).toBe("Bài viết kiểm thử vòng đời trạng thái STT")
    postId = post.id
  })

  test("Trạng thái 2: Bài viết hiển thị trên Feed công khai và chi tiết", async () => {
    // 1. Chi tiết bài viết trả 200
    const detailRes = await call(`/api/v1/posts/${postId}`, {
      cookie: otherUser.cookie,
    })
    expect(detailRes.status).toBe(200)

    // 2. Feed công khai có chứa bài viết
    const feedRes = await call("/api/v1/posts", {
      cookie: otherUser.cookie,
    })
    expect(feedRes.status).toBe(200)
    const feed = await feedRes.json()
    expect(feed.items.some((item: any) => item.id === postId)).toBe(true)
  })

  test("Trạng thái 3: Người ngoài cố tình xóa bài viết của tác giả (IDOR) → 403", async () => {
    const failDelete = await call(`/api/v1/posts/${postId}`, {
      method: "DELETE",
      cookie: otherUser.cookie,
    })
    expect(failDelete.status).toBe(403)

    // Bài viết vẫn còn nguyên
    const verifyRes = await call(`/api/v1/posts/${postId}`)
    expect(verifyRes.status).toBe(200)
  })

  test("Trạng thái 4: Tác giả xóa bài viết (Chuyển sang Soft Delete) → 204", async () => {
    const deleteRes = await call(`/api/v1/posts/${postId}`, {
      method: "DELETE",
      cookie: author.cookie,
    })
    expect(deleteRes.status).toBe(204)
  })

  test("Trạng thái 5: Truy cập bài viết đã xóa mềm (Chi tiết trả 404, Feed biến mất)", async () => {
    // 1. Xem chi tiết bài đã xóa → 404
    const detailRes = await call(`/api/v1/posts/${postId}`, {
      cookie: author.cookie,
    })
    expect(detailRes.status).toBe(404)

    // 2. Feed không còn bài viết này
    const feedRes = await call("/api/v1/posts", {
      cookie: author.cookie,
    })
    const feed = await feedRes.json()
    expect(feed.items.some((item: any) => item.id === postId)).toBe(false)
  })
})
