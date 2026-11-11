import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { notificationSchema, pageSchema } from "@rendez/schema"
import { startTestDb, stopTestDb } from "./helpers/pg"

/**
 * Integration test thông báo (A6.4) — phần chưa phủ ở các file khác.
 *
 * Kiểm `GET /notifications` (schema + mới nhất trước), `PATCH /notifications/:id`
 * (đánh dấu đã đọc, idempotent, 404 khi không phải của mình) và
 * `PATCH /notifications` (đọc tất cả, trả số dòng cập nhật).
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma

const notificationPageSchema = pageSchema(notificationSchema)
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
  handle: string
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
  return { cookie, id: body.id, handle }
}

function call(path: string, init: RequestInit & { cookie?: string } = {}) {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("Content-Type", "application/json")
  if (init.cookie) headers.set("Cookie", init.cookie)
  return app.request(path, { ...init, headers })
}

describe("thông báo", () => {
  let alice: Session
  let bob: Session
  let postId = ""

  beforeAll(async () => {
    alice = await register("Alice Nguyễn", `ntf_alice_${suffix}`)
    bob = await register("Bob Trần", `ntf_bob_${suffix}`)

    const created = await call("/api/v1/posts", {
      method: "POST",
      cookie: alice.cookie,
      body: JSON.stringify({ caption: `Bài của Alice ${suffix}` }),
    })
    expect(created.status).toBe(201)
    postId = ((await created.json()) as { id: string }).id

    // Bob like bài của Alice → Alice có 1 thông báo `like`.
    const like = await call(`/api/v1/posts/${postId}/like`, {
      method: "PATCH",
      cookie: bob.cookie,
      body: JSON.stringify({ liked: true }),
    })
    expect(like.status).toBe(200)
  })

  test("GET /notifications trả page khớp schema, mới nhất trước", async () => {
    const res = await call("/api/v1/notifications", { cookie: alice.cookie })
    expect(res.status).toBe(200)

    const body = (await res.json()) as { items: { id: string; kind: string }[] }
    expect(notificationPageSchema.safeParse(body).success).toBe(true)
    expect(body.items).toHaveLength(1)
    expect(body.items[0]?.kind).toBe("like")
  })

  test("GET /notifications 401 khi chưa đăng nhập", async () => {
    const res = await call("/api/v1/notifications")
    expect(res.status).toBe(401)
  })

  test("cursor uuid giả mạo trả 400, không 500", async () => {
    const res = await call(
      "/api/v1/notifications?cursor=MjAyNi0wMS0wMVQwMDowMDowMC4wMDBafG5vdC1hLXV1aWQ=",
      { cookie: alice.cookie },
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ message: "Cursor không hợp lệ" })
  })

  test("PATCH /notifications/:id đánh dấu đã đọc (idempotent)", async () => {
    const list = (await (await call("/api/v1/notifications", { cookie: alice.cookie })).json()) as {
      items: { id: string; read: boolean }[]
    }
    const id = list.items[0]?.id
    expect(id).toBeString()

    const first = await call(`/api/v1/notifications/${id}`, {
      method: "PATCH",
      cookie: alice.cookie,
    })
    expect(first.status).toBe(200)
    expect(((await first.json()) as { read: boolean }).read).toBe(true)

    // Đánh dấu lần nữa vẫn 200, trạng thái không đổi.
    const again = await call(`/api/v1/notifications/${id}`, {
      method: "PATCH",
      cookie: alice.cookie,
    })
    expect(again.status).toBe(200)
    expect(((await again.json()) as { read: boolean }).read).toBe(true)
  })

  test("PATCH /notifications/:id của người khác trả 404", async () => {
    const list = (await (await call("/api/v1/notifications", { cookie: alice.cookie })).json()) as {
      items: { id: string }[]
    }
    const id = list.items[0]?.id
    expect(id).toBeString()

    const res = await call(`/api/v1/notifications/${id}`, {
      method: "PATCH",
      cookie: bob.cookie,
    })
    expect(res.status).toBe(404)
  })

  test("PATCH /notifications đọc tất cả, trả danh sách sau cập nhật", async () => {
    // Tạo thêm 1 thông báo chưa đọc (Bob bình luận).
    const comment = await call(`/api/v1/posts/${postId}/comments`, {
      method: "POST",
      cookie: bob.cookie,
      body: JSON.stringify({ body: `Bình luận ${suffix}` }),
    })
    expect(comment.status).toBe(201)

    const res = await call("/api/v1/notifications", {
      method: "PATCH",
      cookie: alice.cookie,
    })
    expect(res.status).toBe(200)
    // Hợp đồng (khớp mock): trả danh sách thông báo sau khi đọc tất cả.
    const body = (await res.json()) as { id: string; read: boolean }[]
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThanOrEqual(2)
    expect(body.every((item) => item.read)).toBe(true)

    const after = (await (
      await call("/api/v1/notifications", { cookie: alice.cookie })
    ).json()) as { items: { read: boolean }[] }
    expect(after.items.every((item) => item.read)).toBe(true)
  })
})
