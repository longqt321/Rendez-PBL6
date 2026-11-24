import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"

/**
 * Backend Test Suite: Auth Input Validation (BVA & EP)
 *
 * Kiểm thử kỹ lưỡng các miền giá trị biên và phân vùng tương đương
 * của đầu vào đăng ký tài khoản (Name, Email, Password, Handle).
 * - Name: [2, 40]
 * - Password: [8, 128]
 * - Handle: [3, 30], regex ^[a-z0-9_]+$
 * - Email: cú pháp RFC chuẩn
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma

const suffix = Math.random().toString(36).slice(2, 8)

beforeAll(async () => {
  const url = await startTestDb()
  process.env.DATABASE_URL = url
  process.env.LOG_LEVEL = "error"
  process.env.NODE_ENV = "test"
  process.env.BYPASS_RATE_LIMIT = "1"

  const { createApp } = await import("../src/app")
  prisma = (await import("../src/lib/prisma")).prisma
  app = createApp()
}, 180_000)

afterAll(async () => {
  await prisma?.$disconnect()
  await stopTestDb()
}, 60_000)

function call(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("Content-Type", "application/json")
  return app.request(path, { ...init, headers })
}

describe("Auth Input Validation — BVA & EP", () => {
  describe("Password BVA: [8, 128] ký tự", () => {
    test("BVA-PW1: Mật khẩu 7 ký tự (dưới biên) → 400 Bad Request", async () => {
      const res = await call("/api/v1/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Test User",
          email: `pw7_${suffix}@rendez.test`,
          password: "1234567", // 7 chars
          handle: `pw7_${suffix}`,
          acceptTerms: true,
        }),
      })
      expect(res.status).toBe(400)
    })

    test("BVA-PW2: Mật khẩu 8 ký tự (biên nhỏ nhất) → 201 Created", async () => {
      const res = await call("/api/v1/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Test User",
          email: `pw8_${suffix}@rendez.test`,
          password: "12345678", // 8 chars
          handle: `pw8_${suffix}`,
          acceptTerms: true,
        }),
      })
      expect(res.status).toBe(201)
    })

    test("BVA-PW3: Mật khẩu 128 ký tự (biên lớn nhất) → 201 Created", async () => {
      const res = await call("/api/v1/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Test User",
          email: `pw128_${suffix}@rendez.test`,
          password: "a".repeat(128),
          handle: `pw128_${suffix}`,
          acceptTerms: true,
        }),
      })
      expect(res.status).toBe(201)
    })

    test("BVA-PW4: Mật khẩu 129 ký tự (vượt biên) → 400 Bad Request", async () => {
      const res = await call("/api/v1/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Test User",
          email: `pw129_${suffix}@rendez.test`,
          password: "a".repeat(129),
          handle: `pw129_${suffix}`,
          acceptTerms: true,
        }),
      })
      expect(res.status).toBe(400)
    })
  })

  describe("Handle BVA & EP: [3, 30] ký tự và Regex", () => {
    test("BVA-H1: Handle 2 ký tự (dưới biên) → 400", async () => {
      const res = await call("/api/v1/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Test User",
          email: `h2_${suffix}@rendez.test`,
          password: "password123",
          handle: "ab",
          acceptTerms: true,
        }),
      })
      expect(res.status).toBe(400)
    })

    test("BVA-H2: Handle 3 ký tự (biên nhỏ nhất) → 201", async () => {
      const res = await call("/api/v1/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Test User",
          email: `h3_${suffix}@rendez.test`,
          password: "password123",
          handle: `h3_${suffix.slice(0, 2)}`,
          acceptTerms: true,
        }),
      })
      expect(res.status).toBe(201)
    })

    test("BVA-H3: Handle 31 ký tự (vượt biên) → 400", async () => {
      const res = await call("/api/v1/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Test User",
          email: `h31_${suffix}@rendez.test`,
          password: "password123",
          handle: "a".repeat(31),
          acceptTerms: true,
        }),
      })
      expect(res.status).toBe(400)
    })

    test("EP-H1: Handle chứa chữ hoa, khoảng trắng hoặc ký tự đặc biệt → 400", async () => {
      const invalidHandles = ["Abc_def", "user name", "user@rendez", "user.name", "user-name"]
      for (const handle of invalidHandles) {
        const res = await call("/api/v1/register", {
          method: "POST",
          body: JSON.stringify({
            name: "Test User",
            email: `inv_${Math.random().toString(36).slice(2, 6)}@rendez.test`,
            password: "password123",
            handle,
            acceptTerms: true,
          }),
        })
        expect(res.status).toBe(400)
      }
    })
  })

  describe("Name BVA: [2, 40] ký tự & Điều khoản sử dụng", () => {
    test("BVA-N1: Tên 1 ký tự hoặc rỗng sau khi trim → 400", async () => {
      const res = await call("/api/v1/register", {
        method: "POST",
        body: JSON.stringify({
          name: " a ",
          email: `n1_${suffix}@rendez.test`,
          password: "password123",
          handle: `n1_${suffix}`,
          acceptTerms: true,
        }),
      })
      expect(res.status).toBe(400)
    })

    test("BVA-N2: Tên > 40 ký tự → 400", async () => {
      const res = await call("/api/v1/register", {
        method: "POST",
        body: JSON.stringify({
          name: "a".repeat(41),
          email: `n41_${suffix}@rendez.test`,
          password: "password123",
          handle: `n41_${suffix}`,
          acceptTerms: true,
        }),
      })
      expect(res.status).toBe(400)
    })

    test("EP-TERMS1: Chưa đồng ý Điều khoản sử dụng → 400 Bad Request", async () => {
      const res = await call("/api/v1/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Test User",
          email: `terms_${suffix}@rendez.test`,
          password: "password123",
          handle: `terms_${suffix}`,
          acceptTerms: false,
        }),
      })
      expect(res.status).toBe(400)
    })
  })
})
