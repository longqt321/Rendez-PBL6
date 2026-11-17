import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"
import { registerVerifiedUser } from "./helpers/auth"

/**
 * Integration test `PATCH /notifications` — đánh dấu mọi thông báo chưa đọc
 * thành đã đọc rồi trả toàn bộ danh sách thông báo của user (khớp mock
 * frontend + `markAllNotificationsRead`).
 *
 * Lưu ý: "trả toàn bộ" là hợp đồng hiện tại sau commit `99b3083` (hoàn tác
 * `listAllNotifications` về trả toàn bộ); mô tả cũ "chỉ trả lô vừa đánh dấu
 * đọc" trong `docs/BACKLOG.md` đã lỗi thời.
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

describe("PATCH /notifications đánh dấu tất cả đã đọc", () => {
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

  test("lần 1: đánh dấu mọi thông báo chưa đọc thành read, trả toàn bộ danh sách", async () => {
    await likePost()
    const res = await call("/api/v1/notifications", { method: "PATCH", cookie: alice.cookie })
    expect(res.status).toBe(200)

    const body = (await res.json()) as { id: string; read: boolean }[]
    expect(Array.isArray(body)).toBe(true)
    // Endpoint trả toàn bộ thông báo của user (khớp mock frontend + `markAllNotificationsRead`).
    expect(body.length).toBeGreaterThanOrEqual(1)
    for (const item of body) expect(item.read).toBe(true)
  })

  test("lần 2: thông báo mới (comment) cũng được đánh dấu read sau PATCH", async () => {
    const comment = await call(`/api/v1/posts/${postId}/comments`, {
      method: "POST",
      cookie: bob.cookie,
      body: JSON.stringify({ body: "Bình luận tạo thông báo" }),
    })
    expect(comment.status).toBe(201)

    const res = await call("/api/v1/notifications", { method: "PATCH", cookie: alice.cookie })
    expect(res.status).toBe(200)

    const body = (await res.json()) as { kind: string; read: boolean }[]
    const commentNotification = body.find((item) => item.kind === "comment")
    expect(commentNotification).toBeDefined()
    expect(commentNotification!.read).toBe(true)
  })
})
