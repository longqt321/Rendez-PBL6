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

/** Hậu tố ngẫu nhiên — test chạy chung một container nên dữ liệu phải không đụng nhau. */
const suffix = Math.random().toString(36).slice(2, 8)
const EMAIL = `yen-${suffix}@rendez.test`
const HANDLE = `nguyen_yen_${suffix}`

beforeAll(async () => {
  const url = await startTestDb()
  process.env.DATABASE_URL = url
  process.env.LOG_LEVEL = "error"
  process.env.NODE_ENV = "test"
  // `redirectTo` của request-password-reset phải nằm trong trustedOrigins.
  process.env.CORS_ORIGINS = "http://localhost:5173"

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
        email: EMAIL,
        password: "password123",
        handle: HANDLE,
      }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(userProfileSchema.safeParse(body).success).toBe(true)
    expect(body).toMatchObject({
      name: "Nguyễn Yến",
      handle: HANDLE,
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
    expect(res.headers.get("cache-control")).toBe("no-store")
    expect(userProfileSchema.safeParse(await res.json()).success).toBe(true)
  })

  test("POST /session sai mật khẩu trả 401", async () => {
    const res = await call("/api/v1/session", {
      method: "POST",
      body: JSON.stringify({ email: EMAIL, password: "sai-mat-khau" }),
    })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ message: "Email hoặc mật khẩu không đúng" })
  })

  test("POST /session đúng trả hồ sơ + cookie mới", async () => {
    const res = await call("/api/v1/session", {
      method: "POST",
      body: JSON.stringify({ email: EMAIL, password: "password123" }),
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
      handle: HANDLE,
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

  test("PATCH /me từ chối ảnh hồ sơ khi R2 chưa cấu hình", async () => {
    const res = await call("/api/v1/me", {
      method: "PATCH",
      cookie,
      body: JSON.stringify({
        name: "Yến Nguyễn",
        bio: "",
        location: "",
        privateProfile: false,
        avatarUrl: "https://cdn.example.test/avatars/u/x.webp",
      }),
    })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { message: string }).message).toContain("chưa được cấu hình")
  })

  test("PATCH /me vẫn nhận avatarUrl/coverUrl null (xoá ảnh) khi R2 chưa cấu hình", async () => {
    const res = await call("/api/v1/me", {
      method: "PATCH",
      cookie,
      body: JSON.stringify({
        name: "Yến Nguyễn",
        bio: "",
        location: "",
        privateProfile: false,
        avatarUrl: null,
        coverUrl: null,
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ avatarUrl: null, coverUrl: null })
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
        email: EMAIL,
        password: "password123",
        handle: `${HANDLE}_2`,
      }),
    })
    expect(res.status).toBe(409)
  })

  test("POST /register trùng handle trả 409 {message} — P2002 map đúng trường", async () => {
    const res = await call("/api/v1/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Người Khác",
        email: `khac-${suffix}@rendez.test`,
        password: "password123",
        handle: HANDLE,
      }),
    })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ message: "Handle đã được sử dụng" })
  })
})

describe("quên / đặt lại mật khẩu + xoá tài khoản", () => {
  test("POST /auth/request-password-reset trả {status:true} và sinh token trong DB", async () => {
    const res = await call("/api/v1/auth/request-password-reset", {
      method: "POST",
      body: JSON.stringify({ email: EMAIL, redirectTo: "http://localhost:5173/reset-password" }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: true })

    const verification = await prisma.verification.findFirst({
      where: { identifier: { startsWith: "reset-password:" } },
      orderBy: { createdAt: "desc" },
    })
    expect(verification?.identifier.startsWith("reset-password:")).toBe(true)
  })

  test("request-password-reset email lạ vẫn 200 (không lộ tồn tại)", async () => {
    const res = await call("/api/v1/auth/request-password-reset", {
      method: "POST",
      body: JSON.stringify({ email: `khong-ton-tai-${suffix}@rendez.test` }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: true })
  })

  test("POST /auth/reset-password token sai trả 400", async () => {
    const res = await call("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ newPassword: "password456", token: "token-gia" }),
    })
    expect(res.status).toBe(400)
  })

  test("reset đúng token: mật khẩu cũ 401, mật khẩu mới đăng nhập được", async () => {
    const verification = await prisma.verification.findFirst({
      where: { identifier: { startsWith: "reset-password:" } },
      orderBy: { createdAt: "desc" },
    })
    if (!verification) throw new Error("Không tìm thấy token reset trong DB")
    const token = verification.identifier.slice("reset-password:".length)

    const res = await call("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ newPassword: "password456", token }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: true })

    const oldLogin = await call("/api/v1/session", {
      method: "POST",
      body: JSON.stringify({ email: EMAIL, password: "password123" }),
    })
    expect(oldLogin.status).toBe(401)

    const newLogin = await call("/api/v1/session", {
      method: "POST",
      body: JSON.stringify({ email: EMAIL, password: "password456" }),
    })
    expect(newLogin.status).toBe(200)
  })

  test("DELETE /me xoá mềm: phiên chết, GET /me 401, đăng nhập lại 401", async () => {
    const login = await call("/api/v1/session", {
      method: "POST",
      body: JSON.stringify({ email: EMAIL, password: "password456" }),
    })
    expect(login.status).toBe(200)
    const cookie = sessionCookie(login)

    const res = await call("/api/v1/me", { method: "DELETE", cookie })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ deleted: true })

    const me = await call("/api/v1/me", { cookie })
    expect(me.status).toBe(401)

    const reLogin = await call("/api/v1/session", {
      method: "POST",
      body: JSON.stringify({ email: EMAIL, password: "password456" }),
    })
    expect(reLogin.status).toBe(401)
  })

  test("DELETE /me chưa đăng nhập trả 401", async () => {
    const res = await call("/api/v1/me", { method: "DELETE" })
    expect(res.status).toBe(401)
  })
})
