import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"

/**
 * Integration test K2 — idempotency cho mutation quan trọng trên Postgres thật.
 *
 * Phủ: thiếu header → chạy bình thường; cùng key + cùng payload → replay đúng
 * status/body và KHÔNG tạo bản ghi thứ hai; cùng key + payload khác → 422;
 * key đang xử lý → 409; lỗi 4xx không bị lưu (retry được); key của user khác
 * không ảnh hưởng nhau.
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

describe("idempotency", () => {
  let user: Session
  let other: Session

  beforeAll(async () => {
    user = await register("Người Gửi", `idem_user_${suffix}`)
    other = await register("Người Khác", `idem_other_${suffix}`)
  })

  test("thiếu Idempotency-Key → chạy bình thường, không ghi bảng", async () => {
    const res = await call("/api/v1/collections", {
      method: "POST",
      cookie: user.cookie,
      body: JSON.stringify({ name: `Không key ${suffix}` }),
    })
    expect(res.status).toBe(201)
    expect(await prisma.idempotencyKey.count({ where: { userId: user.id } })).toBe(0)
  })

  test("cùng key + cùng payload → replay 201, không tạo bản ghi thứ hai", async () => {
    const key = crypto.randomUUID()
    const body = JSON.stringify({ name: `Bộ sưu tập idem ${suffix}` })

    const first = await call("/api/v1/collections", {
      method: "POST",
      cookie: user.cookie,
      headers: { "Idempotency-Key": key },
      body,
    })
    expect(first.status).toBe(201)
    const created = (await first.json()) as { id: string }

    const second = await call("/api/v1/collections", {
      method: "POST",
      cookie: user.cookie,
      headers: { "Idempotency-Key": key },
      body,
    })
    expect(second.status).toBe(201)
    expect(second.headers.get("Idempotency-Replayed")).toBe("true")
    const replayed = (await second.json()) as { id: string }
    expect(replayed.id).toBe(created.id)

    expect(
      await prisma.collection.count({
        where: { ownerId: user.id, name: `Bộ sưu tập idem ${suffix}` },
      }),
    ).toBe(1)
  })

  test("cùng key + payload khác → 422", async () => {
    const key = crypto.randomUUID()
    const first = await call("/api/v1/collections", {
      method: "POST",
      cookie: user.cookie,
      headers: { "Idempotency-Key": key },
      body: JSON.stringify({ name: `Payload A ${suffix}` }),
    })
    expect(first.status).toBe(201)

    const second = await call("/api/v1/collections", {
      method: "POST",
      cookie: user.cookie,
      headers: { "Idempotency-Key": key },
      body: JSON.stringify({ name: `Payload B ${suffix}` }),
    })
    expect(second.status).toBe(422)
    expect(((await second.json()) as { message: string }).message).toContain("nội dung khác")
  })

  test("key đang xử lý (pending) → 409", async () => {
    const key = crypto.randomUUID()
    await prisma.idempotencyKey.create({
      data: {
        key,
        userId: user.id,
        requestHash: "hash-cua-request-khac",
        status: "pending",
        expiresAt: new Date(Date.now() + 60_000),
      },
    })

    const res = await call("/api/v1/collections", {
      method: "POST",
      cookie: user.cookie,
      headers: { "Idempotency-Key": key },
      body: JSON.stringify({ name: `Đang xử lý ${suffix}` }),
    })
    expect(res.status).toBe(409)
  })

  test("4xx cũng được lưu (key gắn với payload) — replay đúng lỗi cũ", async () => {
    const key = crypto.randomUUID()
    const body = JSON.stringify({ name: "" })
    const invalid = await call("/api/v1/collections", {
      method: "POST",
      cookie: user.cookie,
      headers: { "Idempotency-Key": key },
      body,
    })
    expect(invalid.status).toBe(400)

    // Gửi lại y nguyên → replay lỗi cũ, không chạy lại handler.
    const replay = await call("/api/v1/collections", {
      method: "POST",
      cookie: user.cookie,
      headers: { "Idempotency-Key": key },
      body,
    })
    expect(replay.status).toBe(400)
    expect(replay.headers.get("Idempotency-Replayed")).toBe("true")

    // Đổi payload với cùng key → 422, không âm thầm tạo bản ghi mới.
    const changed = await call("/api/v1/collections", {
      method: "POST",
      cookie: user.cookie,
      headers: { "Idempotency-Key": key },
      body: JSON.stringify({ name: `Hợp lệ ${suffix}` }),
    })
    expect(changed.status).toBe(422)
  })

  test("key của user khác không ảnh hưởng nhau", async () => {
    const key = crypto.randomUUID()
    const a = await call("/api/v1/collections", {
      method: "POST",
      cookie: user.cookie,
      headers: { "Idempotency-Key": key },
      body: JSON.stringify({ name: `Của A ${suffix}` }),
    })
    expect(a.status).toBe(201)

    const b = await call("/api/v1/collections", {
      method: "POST",
      cookie: other.cookie,
      headers: { "Idempotency-Key": key },
      body: JSON.stringify({ name: `Của B ${suffix}` }),
    })
    expect(b.status).toBe(201)
    expect(b.headers.get("Idempotency-Replayed")).toBeNull()
  })

  test("Idempotency-Key quá dài → 400", async () => {
    const res = await call("/api/v1/collections", {
      method: "POST",
      cookie: user.cookie,
      headers: { "Idempotency-Key": "x".repeat(65) },
      body: JSON.stringify({ name: `Dài ${suffix}` }),
    })
    expect(res.status).toBe(400)
  })

  test("POST /posts cùng key → chỉ một bài được tạo", async () => {
    const key = crypto.randomUUID()
    const body = JSON.stringify({ caption: `Bài idempotent ${suffix}` })

    const first = await call("/api/v1/posts", {
      method: "POST",
      cookie: user.cookie,
      headers: { "Idempotency-Key": key },
      body,
    })
    expect(first.status).toBe(201)
    const post = (await first.json()) as { id: string }

    const second = await call("/api/v1/posts", {
      method: "POST",
      cookie: user.cookie,
      headers: { "Idempotency-Key": key },
      body,
    })
    expect(second.status).toBe(201)
    expect(((await second.json()) as { id: string }).id).toBe(post.id)
    expect(
      await prisma.post.count({
        where: { authorId: user.id, caption: `Bài idempotent ${suffix}` },
      }),
    ).toBe(1)
  })
})
