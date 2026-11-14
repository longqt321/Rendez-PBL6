import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"
import { registerVerifiedUser } from "./helpers/auth"

/**
 * Integration test `PATCH /notifications` — chỉ trả các thông báo vừa được
 * cập nhật (lô đánh dấu đã đọc), không trả toàn bộ thông báo của user.
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
  const session = await registerVerifiedUser(app, prisma, { name, handle })
  return { cookie: session.cookie }
}

function call(path: string, init: RequestInit & { cookie?: string } = {}) {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("Content-Type", "application/json")
  if (init.cookie) headers.set("Cookie", init.cookie)
  return app.request(path, { ...init, headers })
}

describe("PATCH /notifications trả lô vừa cập nhật", () => {
  let alice: Session
  let bob: Session
  let postId = ""

  beforeAll(async () => {
    alice = await register("Alice Patch", `ptc_alice_${suffix}`)
    bob = await register("Bob Patch", `ptc_bob_${suffix}`)

    const created = await call("/api/v1/posts", {
      method: "POST",
      cookie: alice.cookie,
      body: JSON.stringify({ caption: `Bài của Alice ${suffix}` }),
    })
    expect(created.status).toBe(201)
    postId = ((await created.json()) as { id: string }).id
  })

  async function likePost() {
    const like = await call(`/api/v1/posts/${postId}/like`, {
      method: "PATCH",
      cookie: bob.cookie,
      body: JSON.stringify({ liked: true }),
    })
    expect(like.status).toBe(200)
  }

  test("lần 1: trả đúng các thông báo vừa đọc, đã đánh dấu read", async () => {
    await likePost()
    const res = await call("/api/v1/notifications", { method: "PATCH", cookie: alice.cookie })
    expect(res.status).toBe(200)

    const body = (await res.json()) as { id: string; read: boolean }[]
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(1)
    expect(body[0]?.read).toBe(true)
  })

  test("lần 2: chỉ trả thông báo mới xuất hiện sau lần PATCH trước", async () => {
    // Alice like lại bài của Bob? Không — dùng comment của Bob để tạo thông báo mới.
    const comment = await call(`/api/v1/posts/${postId}/comments`, {
      method: "POST",
      cookie: bob.cookie,
      body: JSON.stringify({ body: "Bình luận tạo thông báo" }),
    })
    expect(comment.status).toBe(201)

    const res = await call("/api/v1/notifications", { method: "PATCH", cookie: alice.cookie })
    expect(res.status).toBe(200)

    const body = (await res.json()) as { kind: string; read: boolean }[]
    // Thông báo `like` cũ đã đọc từ lần PATCH trước — không được lặp lại.
    expect(body).toHaveLength(1)
    expect(body[0]?.kind).toBe("comment")
    expect(body[0]?.read).toBe(true)
  })
})
