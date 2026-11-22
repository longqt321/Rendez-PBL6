import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  adminOverviewSchema,
  adminPlaceSchema,
  adminReportSchema,
  adminUserSchema,
  auditLogSchema,
  pageSchema,
} from "@rendez/schema"
import { startTestDb, stopTestDb } from "./helpers/pg"
import { registerVerifiedUser, type TestUser } from "./helpers/auth"

let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma

const reportPageSchema = pageSchema(adminReportSchema)
const placePageSchema = pageSchema(adminPlaceSchema)
const userPageSchema = pageSchema(adminUserSchema)
const logPageSchema = pageSchema(auditLogSchema)

let regularUser: TestUser
let moderatorUser: TestUser
let adminUser: TestUser

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
    handle: "regular_adm_t",
  })
  moderatorUser = await registerVerifiedUser(app, prisma, {
    name: "Mod Test",
    handle: "mod_adm_t",
  })
  adminUser = await registerVerifiedUser(app, prisma, {
    name: "Admin Test",
    handle: "admin_adm_t",
  })

  await prisma.user.update({ where: { id: moderatorUser.id }, data: { role: "moderator" } })
  await prisma.user.update({ where: { id: adminUser.id }, data: { role: "admin" } })
}, 180_000)

afterAll(async () => {
  await prisma?.$disconnect()
  await stopTestDb()
}, 60_000)

function req(path: string, init: RequestInit = {}, cookie?: string) {
  const headers = new Headers(init.headers)
  if (cookie) headers.set("Cookie", cookie)
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  return app.request(path, { ...init, headers })
}

describe("Admin RBAC & Operations", () => {
  test("guest nhận 401 ở mọi endpoint /admin/*", async () => {
    for (const path of [
      "/api/v1/admin/overview",
      "/api/v1/admin/reports",
      "/api/v1/admin/places",
      "/api/v1/admin/users",
      "/api/v1/admin/audit-logs",
    ]) {
      const res = await req(path)
      expect(res.status).toBe(401)
    }
  })

  test("user thường nhận 403 ở mọi endpoint /admin/*", async () => {
    for (const path of [
      "/api/v1/admin/overview",
      "/api/v1/admin/reports",
      "/api/v1/admin/places",
      "/api/v1/admin/users",
      "/api/v1/admin/audit-logs",
    ]) {
      const res = await req(path, {}, regularUser.cookie)
      expect(res.status).toBe(403)
    }
  })

  test("đăng ký không cho tự nâng quyền thành admin", async () => {
    const register = await app.request("/api/v1/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Hacker",
        email: "elevate_adm@rendez.test",
        password: "password123",
        handle: "elevate_adm",
        role: "admin",
      }),
    })
    expect(register.status).toBe(201)

    const user = await prisma.user.findUnique({
      where: { email: "elevate_adm@rendez.test" },
      select: { role: true },
    })
    expect(user?.role).toBe("user")
  })

  test("moderator đọc được overview/reports/places/audit-logs nhưng bị 403 ở /admin/users", async () => {
    const overviewRes = await req("/api/v1/admin/overview", {}, moderatorUser.cookie)
    expect(overviewRes.status).toBe(200)
    const overviewParsed = adminOverviewSchema.parse(await overviewRes.json())
    expect(overviewParsed.runtime.env).toBe("development")
    expect(overviewParsed.runtime.piiMasked).toBe(false)
    expect(overviewParsed.trends14d).toHaveLength(14)
    expect(overviewParsed.venuesByCategory.length).toBeGreaterThan(0)
    expect(overviewParsed.venuesByDistrict.length).toBeGreaterThan(0)

    const reportsRes = await req("/api/v1/admin/reports", {}, moderatorUser.cookie)
    expect(reportsRes.status).toBe(200)
    expect(reportPageSchema.safeParse(await reportsRes.json()).success).toBe(true)

    const placesRes = await req("/api/v1/admin/places?category=cafe", {}, moderatorUser.cookie)
    expect(placesRes.status).toBe(200)
    const filteredPlaces = placePageSchema.parse(await placesRes.json())
    expect(filteredPlaces.items.every((p) => p.category === "cafe")).toBe(true)

    const logsRes = await req("/api/v1/admin/audit-logs", {}, moderatorUser.cookie)
    expect(logsRes.status).toBe(200)
    expect(logPageSchema.safeParse(await logsRes.json()).success).toBe(true)

    const usersRes = await req("/api/v1/admin/users", {}, moderatorUser.cookie)
    expect(usersRes.status).toBe(403)
  })

  test("moderator xử lý báo cáo kèm placeAction=unpublish và ghi audit_logs", async () => {
    const place = await prisma.place.findFirst({
      where: { publishedAt: { not: null }, deletedAt: null },
      select: { id: true, publishedAt: true },
    })
    expect(place).not.toBeNull()
    const targetPlaceId = place!.id

    const createReport = await req(
      `/api/v1/places/${targetPlaceId}/reports`,
      {
        method: "POST",
        body: JSON.stringify({ reason: "closed", detail: "Test đóng cửa" }),
      },
      regularUser.cookie,
    )
    expect(createReport.status).toBe(201)
    const created = (await createReport.json()) as { id: string }

    const patchRes = await req(
      `/api/v1/admin/reports/${created.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status: "reviewed",
          placeAction: "unpublish",
          moderationNote: "Xác minh đã đóng",
        }),
      },
      moderatorUser.cookie,
    )
    expect(patchRes.status).toBe(200)
    const updatedReport = adminReportSchema.parse(await patchRes.json())
    expect(updatedReport.status).toBe("reviewed")
    expect(updatedReport.placePublished).toBe(false)

    // Phục hồi lại địa điểm bằng PATCH /admin/places/:id và kiểm tra audit log.
    const restoreRes = await req(
      `/api/v1/admin/places/${targetPlaceId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ published: true, moderationNote: "Mở lại cho test" }),
      },
      adminUser.cookie,
    )
    expect(restoreRes.status).toBe(200)
    const restoredPlace = adminPlaceSchema.parse(await restoreRes.json())
    expect(restoredPlace.publishedAt).not.toBeNull()

    const logs = await prisma.auditLog.findMany({
      where: { entityId: { in: [created.id, targetPlaceId] } },
      select: { action: true },
    })
    const actions = new Set(logs.map((l) => l.action))
    expect(actions.has("report.resolve")).toBe(true)
    expect(actions.has("place.publish")).toBe(true)
  })

  test("admin quản lý users, chặn tự ban/tự hạ quyền, ban user thu hồi session và chặn login", async () => {
    const listRes = await req("/api/v1/admin/users?q=regular_adm_t", {}, adminUser.cookie)
    expect(listRes.status).toBe(200)
    const page = userPageSchema.parse(await listRes.json())
    expect(page.items.some((u) => u.id === regularUser.id)).toBe(true)

    // Chặn tự khoá hoặc tự hạ quyền
    const selfBan = await req(
      `/api/v1/admin/users/${adminUser.id}`,
      { method: "PATCH", body: JSON.stringify({ banned: true }) },
      adminUser.cookie,
    )
    expect(selfBan.status).toBe(400)

    const selfDemote = await req(
      `/api/v1/admin/users/${adminUser.id}`,
      { method: "PATCH", body: JSON.stringify({ role: "moderator" }) },
      adminUser.cookie,
    )
    expect(selfDemote.status).toBe(400)

    // Ban user thường → thu hồi phiên đang có → gọi /me thành 401 → đăng nhập bị 403
    const banRes = await req(
      `/api/v1/admin/users/${regularUser.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ banned: true, banReason: "Vi phạm quy định spam" }),
      },
      adminUser.cookie,
    )
    expect(banRes.status).toBe(200)
    const bannedUser = adminUserSchema.parse(await banRes.json())
    expect(bannedUser.bannedAt).not.toBeNull()
    expect(bannedUser.banReason).toBe("Vi phạm quy định spam")

    const meAfterBan = await req("/api/v1/me", {}, regularUser.cookie)
    expect(meAfterBan.status).toBe(401)

    const loginWhileBanned = await req("/api/v1/session", {
      method: "POST",
      body: JSON.stringify({
        email: "regular_adm_t@rendez.test",
        password: "password123",
      }),
    })
    expect(loginWhileBanned.status).toBe(403)
  })

  test("APP_ENV=production bật runtime.env=production và che email người dùng trong /admin/users", async () => {
    const prevAppEnv = process.env.APP_ENV
    process.env.APP_ENV = "production"
    try {
      const overviewRes = await req("/api/v1/admin/overview", {}, adminUser.cookie)
      expect(overviewRes.status).toBe(200)
      const overview = adminOverviewSchema.parse(await overviewRes.json())
      expect(overview.runtime.env).toBe("production")
      expect(overview.runtime.piiMasked).toBe(true)

      const usersRes = await req("/api/v1/admin/users?q=regular_adm_t", {}, adminUser.cookie)
      expect(usersRes.status).toBe(200)
      const page = userPageSchema.parse(await usersRes.json())
      const target = page.items.find((u) => u.id === regularUser.id)
      expect(target).toBeDefined()
      expect(target!.email).toContain("***@")
      expect(target!.email).not.toBe("regular_adm_t@rendez.test")
    } finally {
      if (prevAppEnv === undefined) delete process.env.APP_ENV
      else process.env.APP_ENV = prevAppEnv
    }
  })
})
