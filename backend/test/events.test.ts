import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"

/**
 * Integration test `POST /events` — Postgres thật (Testcontainers).
 *
 * Kiểm validate `placeId` phải tồn tại trong bảng `places` (mới), hành vi guest
 * không có anonId/userId giữ nguyên (bỏ event, không lỗi), và event hợp lệ
 * được ghi xuống `interaction_events`.
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma

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

/** Hậu tố ngẫu nhiên — các file test dùng chung một container. */
const suffix = Math.random().toString(36).slice(2, 8)

function postEvents(body: unknown, ip = "10.5.0.1") {
  return app.request("/api/v1/events", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
    body: JSON.stringify(body),
  })
}

describe("POST /events — validate placeId", () => {
  test("placeId tồn tại → event được ghi xuống DB", async () => {
    const place = await prisma.place.findFirst({
      where: { deletedAt: null },
      select: { id: true },
      orderBy: { id: "asc" },
    })
    expect(place).not.toBeNull()
    const anonId = `anon-valid-${suffix}`

    const res = await postEvents({
      events: [{ eventType: "place_click", placeId: place!.id, anonId }],
    })
    expect(res.status).toBe(202)
    const body = (await res.json()) as { accepted: number; recorded: number }
    expect(body).toEqual({ accepted: 1, recorded: 1 })

    const rows = await prisma.$queryRaw<{ event_type: string; place_id: string }[]>`
      SELECT event_type, place_id FROM interaction_events WHERE anon_id = ${anonId}
    `
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ event_type: "place_click", place_id: place!.id })
  })

  test("placeId không tồn tại → 400, không ghi event nào", async () => {
    const res = await postEvents(
      {
        events: [{ eventType: "place_click", placeId: `khong-ton-tai-${suffix}` }],
      },
      "10.5.0.2",
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe("placeId không tồn tại")
  })

  test("guest không có anonId/userId → giữ behaviour hiện tại: 202, bỏ qua event", async () => {
    const place = await prisma.place.findFirst({
      where: { deletedAt: null },
      select: { id: true },
      orderBy: { id: "asc" },
    })
    const res = await postEvents(
      { events: [{ eventType: "place_click", placeId: place!.id }] },
      "10.5.0.3",
    )
    expect(res.status).toBe(202)
    const body = (await res.json()) as { accepted: number; recorded: number }
    expect(body).toEqual({ accepted: 1, recorded: 0 })
  })
})
