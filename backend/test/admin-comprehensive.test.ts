import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"
import { registerVerifiedUser, type TestUser } from "./helpers/auth"

/**
 * Integration test chuyên sâu cho Admin:
 * - Ma trận phân quyền RBAC (Anonymous / User / Moderator / Admin)
 * - PATCH /admin/places/:id (BVA tọa độ, publish/unpublish, ghi audit log)
 * - GET /admin/observability (xác minh fix bug `resultsCount: 0` -> zeroResultRate,
 *   và đầy đủ chỉ số Production: queue, circuitBreakers, eventLoopLagMs, authFailed)
 * - GET /admin/audit-logs (filter & cursor hỏng không trả 500)
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma
let regularUser: TestUser
let moderatorUser: TestUser
let adminUser: TestUser

function req(path: string, init: RequestInit = {}, cookie?: string) {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("Content-Type", "application/json")
  if (cookie) headers.set("Cookie", cookie)
  return app.request(path, { ...init, headers })
}

beforeAll(async () => {
  const url = await startTestDb()
  process.env.DATABASE_URL = url
  process.env.LOG_LEVEL = "error"
  process.env.NODE_ENV = "test"
  process.env.BYPASS_RATE_LIMIT = "1"

  const { createApp } = await import("../src/app")
  prisma = (await import("../src/lib/prisma")).prisma
  app = createApp()

  regularUser = await registerVerifiedUser(app, prisma, {
    name: "User Thường",
    handle: "adm_comp_u",
  })
  moderatorUser = await registerVerifiedUser(app, prisma, {
    name: "Mod Kiểm Duyệt",
    handle: "adm_comp_m",
  })
  adminUser = await registerVerifiedUser(app, prisma, {
    name: "Admin Hệ Thống",
    handle: "adm_comp_a",
  })

  await prisma.user.update({ where: { id: moderatorUser.id }, data: { role: "moderator" } })
  await prisma.user.update({ where: { id: adminUser.id }, data: { role: "admin" } })

  await prisma.place.create({
    data: {
      id: "adm-place-1",
      name: "Quán Admin Test",
      category: "cafe",
      address: "10 Trần Phú",
      district: "Hải Châu",
      priceLevel: 2,
      lat: 16.0678,
      lng: 108.2208,
      publishedAt: new Date(),
    },
  })
}, 180_000)

afterAll(async () => {
  await prisma?.$disconnect()
  await stopTestDb()
}, 60_000)

describe("Admin Operations — RBAC Matrix, Places BVA, Observability & Audit Logs", () => {
  test("RBAC Matrix: phân tách chặt quyền Anonymous (401), User (403), Moderator (chỉ reports/places), Admin (toàn quyền)", async () => {
    // Anonymous -> 401
    expect((await req("/api/v1/admin/observability")).status).toBe(401)
    expect((await req("/api/v1/admin/users")).status).toBe(401)

    // Regular user -> 403 trên mọi route admin
    for (const path of [
      "/api/v1/admin/overview",
      "/api/v1/admin/places",
      "/api/v1/admin/users",
      "/api/v1/admin/observability",
      "/api/v1/admin/audit-logs",
    ]) {
      expect((await req(path, {}, regularUser.cookie)).status).toBe(403)
    }

    // Moderator KHÔNG được phép truy cập /admin/users hoặc /admin/observability
    expect((await req("/api/v1/admin/observability", {}, moderatorUser.cookie)).status).toBe(403)
    expect(
      (
        await req(
          `/api/v1/admin/users/${regularUser.id}`,
          { method: "PATCH", body: JSON.stringify({ role: "admin" }) },
          moderatorUser.cookie,
        )
      ).status,
    ).toBe(403)

    // Admin truy cập thành công
    expect((await req("/api/v1/admin/observability", {}, adminUser.cookie)).status).toBe(200)
  })

  test("PATCH /admin/places/:id: từ chối tọa độ ngoài biên, chấp nhận sửa hợp lệ và ghi audit_logs", async () => {
    // Tọa độ ngoài biên -> 400
    const badCoord = await req(
      "/api/v1/admin/places/adm-place-1",
      { method: "PATCH", body: JSON.stringify({ lat: 95, lng: 108.22 }) },
      adminUser.cookie,
    )
    expect(badCoord.status).toBe(400)

    // Sửa hợp lệ (đổi tên + unpublish) -> 200
    const okRes = await req(
      "/api/v1/admin/places/adm-place-1",
      {
        method: "PATCH",
        body: JSON.stringify({ name: "Quán Admin Đã Sửa", published: false }),
      },
      adminUser.cookie,
    )
    expect(okRes.status).toBe(200)
    const updated = (await okRes.json()) as { name: string; publishedAt: string | null }
    expect(updated.name).toBe("Quán Admin Đã Sửa")
    expect(updated.publishedAt).toBeNull()

    // Cursor hỏng phải trả 400 sạch sẽ (không 500)
    const badCursorRes = await req(
      "/api/v1/admin/audit-logs?entity=place&cursor=!!!broken-cursor!!!",
      {},
      adminUser.cookie,
    )
    expect(badCursorRes.status).toBe(400)

    // Xác minh audit log ghi nhận thao tác và lọc hợp lệ hoạt động đúng
    const logsRes = await req("/api/v1/admin/audit-logs?entity=place", {}, adminUser.cookie)
    expect(logsRes.status).toBe(200)
    const logsData = (await logsRes.json()) as { items: { entityId: string; action: string }[] }
    expect(logsData.items.some((item) => item.entityId === "adm-place-1")).toBe(true)
  })

  test("GET /admin/observability: tính chính xác zeroResultRate từ context.resultsCount=0 và expose đủ chỉ số Production", async () => {
    // Ghi 2 sự kiện search_query (đúng định dạng mà routes/places.ts ghi)
    await prisma.interactionEvent.createMany({
      data: [
        {
          eventType: "search_query",
          query: "món lạ không tồn tại xyz",
          weight: 1,
          context: { resultsCount: 0 },
        },
        {
          eventType: "search_query",
          query: "cà phê",
          weight: 1,
          context: { resultsCount: 12 },
        },
      ],
    })

    const res = await req("/api/v1/admin/observability", {}, adminUser.cookie)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      security: {
        unauthorized401: number
        forbidden403: number
        rateLimited429: number
        authFailed: number
      }
      infrastructure: {
        dbPool: { total: number; idle: number; waiting: number; max: number }
        queue: { active: boolean; queued: number; failed: number }
        circuitBreakers: { name: string; state: string; openCount: number }[]
        eventLoopLagMs: number
        memoryRssMb: number
      }
      searchQuality24h: {
        totalSearches: number
        zeroResultSearches: number
        zeroResultRate: number
        topZeroQueries: { query: string; count: number }[]
      }
    }

    // Xác minh bug `resultsCount` đã được sửa: 1/2 = 0.5
    expect(body.searchQuality24h.totalSearches).toBe(2)
    expect(body.searchQuality24h.zeroResultSearches).toBe(1)
    expect(body.searchQuality24h.zeroResultRate).toBe(0.5)
    expect(body.searchQuality24h.topZeroQueries[0]).toEqual({
      query: "món lạ không tồn tại xyz",
      count: 1,
    })

    // Xác minh đủ 4 nhóm chỉ số Production bổ sung
    expect(typeof body.security.authFailed).toBe("number")
    expect(typeof body.infrastructure.eventLoopLagMs).toBe("number")
    expect(body.infrastructure.queue).toBeDefined()
    expect(typeof body.infrastructure.queue.queued).toBe("number")
    expect(Array.isArray(body.infrastructure.circuitBreakers)).toBe(true)
  })
})
