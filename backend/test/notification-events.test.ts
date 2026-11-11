import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"

/**
 * Integration test G6.3 — SSE thông báo per-user trên Postgres thật.
 *
 * Phủ: kênh cần đăng nhập; sự kiện đầu là version hiện tại; hành động của
 * người khác (theo dõi) đẩy `notification-created` ngay cho người nhận;
 * payload trung tính (không nội dung thông báo, không handle); người không
 * liên quan không nhận sự kiện.
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

/** Đọc một khối `event:`/`data:` từ stream SSE. */
function makeReader(res: Response) {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  return async function readEvent(): Promise<{ event: string; data: string }> {
    while (true) {
      const match = buffer.match(/event: (.+)\ndata: (.+)\n/u)
      if (match) {
        buffer = buffer.slice(match.index! + match[0].length)
        return { event: match[1]!, data: match[2]! }
      }
      const chunk = await reader.read()
      if (chunk.done) throw new Error("SSE stream đã đóng trước khi có event")
      buffer += decoder.decode(chunk.value ?? new Uint8Array())
    }
  }
}

describe("SSE thông báo", () => {
  let receiver: Session
  let actor: Session
  let stranger: Session

  beforeAll(async () => {
    receiver = await register("Người Nhận", `notif_recv_${suffix}`)
    actor = await register("Người Thao Tác", `notif_actor_${suffix}`)
    stranger = await register("Người Ngoài", `notif_stranger_${suffix}`)
  })

  test("chưa đăng nhập → 401", async () => {
    const res = await call("/api/v1/notifications/events")
    expect(res.status).toBe(401)
  })

  test("theo dõi → người nhận nhận notification-created ngay, payload trung tính", async () => {
    const controller = new AbortController()
    const res = await call("/api/v1/notifications/events", {
      cookie: receiver.cookie,
      signal: controller.signal,
    })
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/event-stream")

    const readEvent = makeReader(res)

    // Sự kiện đầu tiên là version hiện tại của kênh.
    const first = await readEvent()
    expect(first.event).toBe("notification-created")
    const initial = JSON.parse(first.data) as { version: number }
    expect(typeof initial.version).toBe("number")

    // Người khác theo dõi → server ghi thông báo và đẩy SSE.
    const follow = await call(`/api/v1/users/${receiver.handle}/follow`, {
      method: "POST",
      cookie: actor.cookie,
    })
    expect([200, 201, 204]).toContain(follow.status)

    const second = await readEvent()
    expect(second.event).toBe("notification-created")
    const updated = JSON.parse(second.data) as { version: number }
    expect(updated.version).toBeGreaterThan(initial.version)

    // Payload trung tính: không lộ nội dung thông báo hay danh tính actor.
    expect(second.data).not.toContain("follow")
    expect(second.data).not.toContain(actor.handle)
    expect(second.data).not.toContain("actorName")

    controller.abort()
  }, 20_000)

  test("người không liên quan không nhận sự kiện của người khác", async () => {
    const controller = new AbortController()
    const res = await call("/api/v1/notifications/events", {
      cookie: stranger.cookie,
      signal: controller.signal,
    })
    const readEvent = makeReader(res)
    const first = await readEvent()
    const before = (JSON.parse(first.data) as { version: number }).version

    // Theo dõi người nhận → chỉ kênh của receiver tăng version.
    await call(`/api/v1/users/${receiver.handle}/follow`, {
      method: "POST",
      cookie: actor.cookie,
    })

    // Đọc sự kiện kế tiếp của stranger phải KHÔNG có gì trong 2 giây —
    // (kênh riêng, không nhận nhầm notification-created của người khác).
    const timeout = new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 2_000))
    const next = await Promise.race([readEvent(), timeout])
    expect(next).toBe("timeout")
    expect((JSON.parse(first.data) as { version: number }).version).toBe(before)

    controller.abort()
  }, 20_000)
})
