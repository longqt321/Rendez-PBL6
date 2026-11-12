import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"
import { registerVerifiedUser } from "./helpers/auth"

/**
 * Rate limit tương tác xã hội (V8-04) — like 30/phút, bình luận 10/phút,
 * follow 20/phút, đếm theo userId.
 *
 * Kiểm: vượt ngưỡng nhận 429 kèm `Retry-After` và message tiếng Việt; người
 * dùng KHÁC từ cùng IP vẫn thao tác được (bộ đếm tách theo user).
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

describe("rate limit like/follow/comment", () => {
  let author: Session
  let spammer: Session
  let other: Session
  let postId = ""

  beforeAll(async () => {
    author = await register("Tác Giả", `rl_soc_author_${suffix}`)
    spammer = await register("Người Spam", `rl_soc_spam_${suffix}`)
    other = await register("Người Khác", `rl_soc_other_${suffix}`)

    const res = await call("/api/v1/posts", {
      method: "POST",
      cookie: author.cookie,
      body: JSON.stringify({ caption: "Bài để test rate limit tương tác" }),
    })
    expect(res.status).toBe(201)
    postId = ((await res.json()) as { id: string }).id
  }, 60_000)

  test("like: 30 request đầu 200, request thứ 31 nhận 429 + Retry-After", async () => {
    for (let i = 0; i < 30; i += 1) {
      const res = await call(`/api/v1/posts/${postId}/like`, {
        method: "PATCH",
        cookie: spammer.cookie,
        body: JSON.stringify({ liked: i % 2 === 0 }),
      })
      expect(res.status).toBe(200)
    }

    const blocked = await call(`/api/v1/posts/${postId}/like`, {
      method: "PATCH",
      cookie: spammer.cookie,
      body: JSON.stringify({ liked: true }),
    })
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get("Retry-After")).not.toBeNull()
    expect(((await blocked.json()) as { message: string }).message).toContain("quá nhanh")

    // Người khác cùng IP (test không có socket) vẫn like được — đếm theo user.
    const resOther = await call(`/api/v1/posts/${postId}/like`, {
      method: "PATCH",
      cookie: other.cookie,
      body: JSON.stringify({ liked: true }),
    })
    expect(resOther.status).toBe(200)
  }, 60_000)

  test("comment: 10 bình luận đầu 201, thứ 11 nhận 429", async () => {
    for (let i = 0; i < 10; i += 1) {
      const res = await call(`/api/v1/posts/${postId}/comments`, {
        method: "POST",
        cookie: spammer.cookie,
        body: JSON.stringify({ body: `Bình luận spam ${i + 1}` }),
      })
      expect(res.status).toBe(201)
    }

    const blocked = await call(`/api/v1/posts/${postId}/comments`, {
      method: "POST",
      cookie: spammer.cookie,
      body: JSON.stringify({ body: "Bình luận thứ 11" }),
    })
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get("Retry-After")).not.toBeNull()
  }, 60_000)

  test("follow: 20 lần đầu 200, lần 21 nhận 429", async () => {
    for (let i = 0; i < 20; i += 1) {
      const res = await call(`/api/v1/users/rl_soc_author_${suffix}/follow`, {
        method: i % 2 === 0 ? "POST" : "DELETE",
        cookie: spammer.cookie,
      })
      expect(res.status).toBe(200)
    }

    const blocked = await call(`/api/v1/users/rl_soc_author_${suffix}/follow`, {
      method: "POST",
      cookie: spammer.cookie,
    })
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get("Retry-After")).not.toBeNull()

    // Người khác vẫn follow được.
    const resOther = await call(`/api/v1/users/rl_soc_author_${suffix}/follow`, {
      method: "POST",
      cookie: other.cookie,
    })
    expect(resOther.status).toBe(200)
  }, 60_000)
})
