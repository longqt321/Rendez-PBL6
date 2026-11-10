import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { userProfileSchema } from "@rendez/schema"
import { startTestDb, stopTestDb } from "./helpers/pg"

/**
 * Integration test Phase 1 — Postgres thật (Testcontainers), không mock.
 *
 * Kiểm đúng hợp đồng Phần A: shape `userProfileSchema`, 401 khi chưa đăng
 * nhập, `PATCH /me` chỉ nhận 4 trường, `DELETE /session` trả `{loggedOut:true}`.
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

/** Gọi API như client thật, giữ cookie phiên giữa các request. */
async function call(path: string, init: RequestInit & { cookie?: string } = {}) {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("Content-Type", "application/json")
  if (init.cookie) headers.set("Cookie", init.cookie)
  return app.request(path, { ...init, headers })
}

/** Rút cookie phiên từ Set-Cookie để gửi lại ở request sau. */
function sessionCookie(res: Response): string {
  const cookies = res.headers.getSetCookie()
  const session = cookies.find((value) => value.startsWith("better-auth.session_token="))
  if (!session) throw new Error("Response không có cookie phiên")
  return session.split(";")[0] ?? ""
}

describe("auth + hồ sơ", () => {
  let cookie = ""

  test("POST /register tạo tài khoản, trả hồ sơ khớp schema + cookie phiên", async () => {
    const res = await call("/api/v1/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Nguyễn Yến",
        email: "yen@rendez.test",
        password: "password123",
        handle: "nguyen_yen",
      }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(userProfileSchema.safeParse(body).success).toBe(true)
    expect(body).toMatchObject({
      name: "Nguyễn Yến",
      handle: "nguyen_yen",
      initials: "NY",
      isMe: true,
      postCount: 0,
    })
    cookie = sessionCookie(res)
  })

  test("GET /me chưa đăng nhập trả 401 {message}", async () => {
    const res = await call("/api/v1/me")
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ message: "Chưa đăng nhập" })
  })

  test("GET /me có cookie trả hồ sơ khớp schema", async () => {
    const res = await call("/api/v1/me", { cookie })
    expect(res.status).toBe(200)
    expect(userProfileSchema.safeParse(await res.json()).success).toBe(true)
  })

  test("POST /session sai mật khẩu trả 401", async () => {
    const res = await call("/api/v1/session", {
      method: "POST",
      body: JSON.stringify({ email: "yen@rendez.test", password: "sai-mat-khau" }),
    })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ message: "Email hoặc mật khẩu không đúng" })
  })

  test("POST /session đúng trả hồ sơ + cookie mới", async () => {
    const res = await call("/api/v1/session", {
      method: "POST",
      body: JSON.stringify({ email: "yen@rendez.test", password: "password123" }),
    })
    expect(res.status).toBe(200)
    expect(userProfileSchema.safeParse(await res.json()).success).toBe(true)
    cookie = sessionCookie(res)
  })

  test("PATCH /me cập nhật 4 trường, bỏ qua trường lạ", async () => {
    const res = await call("/api/v1/me", {
      method: "PATCH",
      cookie,
      body: JSON.stringify({
        name: "Yến Nguyễn",
        bio: "Mê bánh xèo",
        location: "Đà Nẵng",
        privateProfile: true,
        handle: "bi-doi-trom",
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      name: "Yến Nguyễn",
      bio: "Mê bánh xèo",
      location: "Đà Nẵng",
      privateProfile: true,
      handle: "nguyen_yen",
    })
  })

  test("PATCH /me tên quá ngắn trả 400", async () => {
    const res = await call("/api/v1/me", {
      method: "PATCH",
      cookie,
      body: JSON.stringify({ name: "Y", bio: "", location: "", privateProfile: false }),
    })
    expect(res.status).toBe(400)
  })

  test("DELETE /session trả {loggedOut:true}, phiên sau đó 401", async () => {
    const res = await call("/api/v1/session", { method: "DELETE", cookie })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ loggedOut: true })

    const me = await call("/api/v1/me", { cookie })
    expect(me.status).toBe(401)
  })

  test("POST /register trùng email trả 409", async () => {
    const res = await call("/api/v1/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Nguyễn Yến 2",
        email: "yen@rendez.test",
        password: "password123",
        handle: "nguyen_yen_2",
      }),
    })
    expect(res.status).toBe(409)
  })
})
