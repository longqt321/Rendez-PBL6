import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"

/**
 * Integration test Phase 7 — rate limit Postgres, body limit, `/readyz`,
 * route media (503 khi chưa cấu hình R2) và hàm presign R2 (tất định).
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

function call(path: string, init: RequestInit & { cookie?: string } = {}) {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("Content-Type", "application/json")
  if (init.cookie) headers.set("Cookie", init.cookie)
  return app.request(path, { ...init, headers })
}

describe("rate limit + hạ tầng", () => {
  test("GET /readyz trả 200 khi DB sống", async () => {
    const res = await call("/readyz")
    expect(res.status).toBe(200)
    expect(((await res.json()) as { status: string }).status).toBe("ok")
  })

  test("CHECK price_level 1–3 ở DB (migration 11) — chốt cuối, không clamp khi đọc", async () => {
    // Constraint tồn tại…
    const constraints = await prisma.$queryRaw<{ conname: string }[]>`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'places'::regclass AND conname = 'places_price_level_check'
    `
    expect(constraints).toHaveLength(1)

    // …và chặn giá trị ngoài 1–3 ngay tại DB (không phải tầng app sửa lặng lẽ).
    let blocked = false
    try {
      await prisma.$executeRaw`
        INSERT INTO places (id, name, address, city, category, price_level, updated_at)
        VALUES ('00000000-0000-0000-0000-000000000000', 'test-price', 'x', 'Đà Nẵng',
                'cafe'::place_category, 9, now())
      `
    } catch {
      blocked = true
    }
    expect(blocked).toBe(true)
  })

  test("rate limit: vượt ngưỡng POST /session trả 429 kèm Retry-After", async () => {
    // Ngưỡng auth-session là 20/phút/IP — gửi 21 lần đăng nhập sai.
    let lastStatus = 0
    let retryAfter = ""
    for (let i = 0; i < 21; i++) {
      const res = await call("/api/v1/session", {
        method: "POST",
        body: JSON.stringify({ email: `rl_${suffix}@rendez.test`, password: "sai-mat-khau" }),
        headers: { "X-Forwarded-For": `10.9.9.${suffix.length % 250}` },
      })
      lastStatus = res.status
      retryAfter = res.headers.get("Retry-After") ?? ""
    }
    expect(lastStatus).toBe(429)
    expect(Number(retryAfter)).toBeGreaterThan(0)

    // IP khác không bị ảnh hưởng (khoá theo IP).
    const otherIp = await call("/api/v1/session", {
      method: "POST",
      body: JSON.stringify({ email: `rl_${suffix}@rendez.test`, password: "sai-mat-khau" }),
      headers: { "X-Forwarded-For": "10.9.9.254" },
    })
    expect(otherIp.status).toBe(401)
  })

  test("body limit: request > 1MB trả 413 JSON {message}", async () => {
    const res = await call("/api/v1/places", { method: "POST", body: "x".repeat(1024 * 1024 + 1) })
    expect(res.status).toBe(413)
    expect(((await res.json()) as { message: string }).message).toBeTruthy()
  })

  test("POST /media cần đăng nhập", async () => {
    const res = await call("/api/v1/media", {
      method: "POST",
      body: JSON.stringify({ folder: "posts", contentType: "image/jpeg" }),
    })
    expect(res.status).toBe(401)
  })

  test("POST /media trả 503 khi chưa cấu hình R2", async () => {
    const cookie = (
      (
        await app.request("/api/v1/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Người Ảnh",
            email: `media_${suffix}@rendez.test`,
            password: "password123",
            handle: `media_${suffix}`,
          }),
        })
      ).headers.getSetCookie()[0] ?? ""
    ).split(";")[0]

    const res = await call("/api/v1/media", {
      method: "POST",
      cookie,
      body: JSON.stringify({ folder: "posts", contentType: "image/jpeg" }),
    })
    expect(res.status).toBe(503)
  })

  test("presignPut sinh URL SigV4 tất định, đủ tham số", async () => {
    const { presignPut } = await import("../src/lib/r2")
    const config = {
      accountId: "acct123",
      accessKeyId: "AKIDEXAMPLE",
      secretAccessKey: "secret".repeat(8),
      bucket: "rendez-media",
      publicBaseUrl: "https://cdn.rendez.example",
    }
    const now = new Date("2026-11-11T00:00:00Z")
    const a = presignPut(config, { key: "posts/user-1/abc.jpg", expiresInSeconds: 600, now })
    const b = presignPut(config, { key: "posts/user-1/abc.jpg", expiresInSeconds: 600, now })
    expect(a.url).toBe(b.url) // tất định với cùng thời điểm

    const url = new URL(a.url)
    expect(url.host).toBe("acct123.r2.cloudflarestorage.com")
    expect(url.pathname).toBe("/rendez-media/posts/user-1/abc.jpg")
    expect(url.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256")
    expect(url.searchParams.get("X-Amz-Expires")).toBe("600")
    expect(url.searchParams.get("X-Amz-Date")).toBe("20261111T000000Z")
    expect(url.searchParams.get("X-Amz-Credential")).toBe(
      "AKIDEXAMPLE/20261111/auto/s3/aws4_request",
    )
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toBe("host")
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/)
    expect(a.publicUrl).toBe("https://cdn.rendez.example/posts/user-1/abc.jpg")

    // Key có ký tự đặc biệt phải được mã hoá từng đoạn, giữ `/`.
    const weird = presignPut(config, { key: "posts/u 1/a+b.jpg", expiresInSeconds: 600, now })
    expect(new URL(weird.url).pathname).toBe("/rendez-media/posts/u%201/a%2Bb.jpg")
  })
})
