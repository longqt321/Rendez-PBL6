import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"

/**
 * Rate limit theo USER (`rateLimit({ byUser: true })`) — `/media` 10 URL/giờ/user.
 *
 * Kiểm hai điều mà rate limit theo IP không làm được:
 * 1. Một tài khoản vượt ngưỡng thì nhận 429.
 * 2. Hai tài khoản KHÁC nhau từ CÙNG một IP không chặn lẫn nhau (bộ đếm tách
 *    theo userId) — đây là lý do đổi sang `byUser` cho route đã đăng nhập.
 *
 * File riêng vì `env` parse lúc import: cần R2_* trước khi import `app` để
 * `/media` đi vào nhánh presign (không phải 503).
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

async function register(name: string, handle: string): Promise<string> {
  const res = await app.request("/api/v1/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email: `${handle}@rendez.test`, password: "password123", handle }),
  })
  expect(res.status).toBe(201)
  return (res.headers.getSetCookie()[0] ?? "").split(";")[0] ?? ""
}

function requestMedia(cookie: string) {
  return app.request("/api/v1/media", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ folder: "posts", contentType: "image/jpeg" }),
  })
}

describe("rate limit theo user", () => {
  test("user vượt 10 URL/giờ nhận 429; user khác cùng IP vẫn dùng được", async () => {
    const cookieA = await register("Người A", `rl_a_${suffix}`)
    const cookieB = await register("Người B", `rl_b_${suffix}`)

    // 10 request đầu của A: trong ngưỡng.
    for (let i = 0; i < 10; i += 1) {
      const res = await requestMedia(cookieA)
      expect(res.status).toBe(201)
    }

    // Request thứ 11 → 429 kèm Retry-After.
    const blocked = await requestMedia(cookieA)
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get("Retry-After")).not.toBeNull()

    // B gọi từ CÙNG IP (test không có socket → cùng "unknown") nhưng khoá riêng.
    const resB = await requestMedia(cookieB)
    expect(resB.status).toBe(201)
  }, 60_000)
})
