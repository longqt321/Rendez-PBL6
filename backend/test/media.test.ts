import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"

/**
 * Integration test route media khi R2 ĐÃ cấu hình (biến env giả).
 *
 * File riêng vì `env` parse lúc import — đặt R2_* trước khi import `app`
 * để đi vào nhánh presign thật; `infra.test.ts` giữ nhánh 503 (không cấu hình).
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma

const suffix = Math.random().toString(36).slice(2, 8)

beforeAll(async () => {
  const url = await startTestDb()
  process.env.DATABASE_URL = url
  process.env.LOG_LEVEL = "error"
  process.env.NODE_ENV = "test"
  process.env.R2_ACCOUNT_ID = "acct-test"
  process.env.R2_ACCESS_KEY_ID = "AKIDTEST"
  process.env.R2_SECRET_ACCESS_KEY = "s".repeat(32)
  process.env.R2_BUCKET = "rendez-media"
  process.env.R2_PUBLIC_BASE_URL = "https://cdn.rendez.test"

  const { createApp } = await import("../src/app")
  prisma = (await import("../src/lib/prisma")).prisma
  app = createApp()
}, 180_000)

afterAll(async () => {
  await prisma?.$disconnect()
  await stopTestDb()
}, 60_000)

function call(path: string, init: RequestInit & { cookie?: string } = {}) {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("Content-Type", "application/json")
  if (init.cookie) headers.set("Cookie", init.cookie)
  return app.request(path, { ...init, headers })
}

describe("POST /media khi R2 đã cấu hình", () => {
  test("trả presigned PUT + publicUrl, key do server sinh", async () => {
    const cookie = (
      (
        await app.request("/api/v1/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Người Ảnh",
            email: `media_ok_${suffix}@rendez.test`,
            password: "password123",
            handle: `media_ok_${suffix}`,
          }),
        })
      ).headers.getSetCookie()[0] ?? ""
    ).split(";")[0]
    expect(cookie).not.toBe("")

    const res = await call("/api/v1/media", {
      method: "POST",
      cookie,
      body: JSON.stringify({ folder: "posts", contentType: "image/jpeg" }),
    })
    expect(res.status).toBe(201)

    const body = (await res.json()) as {
      uploadUrl: string
      publicUrl: string
      key: string
      expiresAt: string
      headers: Record<string, string>
    }
    const url = new URL(body.uploadUrl)
    expect(url.host).toBe("acct-test.r2.cloudflarestorage.com")
    // Key: `<folder>/<userId>/<uuid>.<ext>` — server sinh, không dùng tên client.
    expect(url.pathname.startsWith("/rendez-media/posts/")).toBe(true)
    expect(url.pathname.endsWith(".jpg")).toBe(true)
    expect(url.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256")
    expect(body.headers["Content-Type"]).toBe("image/jpeg")
    expect(body.publicUrl).toBe(`https://cdn.rendez.test/${body.key}`)
    expect(Number(new Date(body.expiresAt)) - Date.now()).toBeGreaterThan(500_000)
  })

  test("contentType không phải ảnh (SVG) trả 400", async () => {
    const cookie = (
      (
        await app.request("/api/v1/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Người SVG",
            email: `media_svg_${suffix}@rendez.test`,
            password: "password123",
            handle: `media_svg_${suffix}`,
          }),
        })
      ).headers.getSetCookie()[0] ?? ""
    ).split(";")[0]

    const res = await call("/api/v1/media", {
      method: "POST",
      cookie,
      body: JSON.stringify({ folder: "posts", contentType: "image/svg+xml" }),
    })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { message: string }).message).toContain("ảnh")
  })

  test("folder lạ trả 400", async () => {
    const cookie = (
      (
        await app.request("/api/v1/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Người Thư Mục",
            email: `media_dir_${suffix}@rendez.test`,
            password: "password123",
            handle: `media_dir_${suffix}`,
          }),
        })
      ).headers.getSetCookie()[0] ?? ""
    ).split(";")[0]

    const res = await call("/api/v1/media", {
      method: "POST",
      cookie,
      body: JSON.stringify({ folder: "hacker", contentType: "image/jpeg" }),
    })
    expect(res.status).toBe(400)
  })
})
