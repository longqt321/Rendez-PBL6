import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { postSchema } from "@rendez/schema"
import { startTestDb, stopTestDb } from "./helpers/pg"

/**
 * Ảnh bài đăng (G5b) — chạy trên Postgres thật với R2 ĐÃ cấu hình (biến env giả).
 *
 * File riêng vì `env` parse lúc import: `R2_*` phải đặt TRƯỚC khi import `app`.
 * Kiểm: lưu ảnh đúng thứ tự, trả ảnh ở GET, và chặn URL không thuộc thư mục
 * `posts/<userId>/` của chính người đăng.
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma

const CDN = "https://cdn.rendez.test"
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
  process.env.R2_PUBLIC_BASE_URL = CDN

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
  return { cookie, id: body.id }
}

function call(path: string, init: RequestInit & { cookie?: string } = {}) {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("Content-Type", "application/json")
  if (init.cookie) headers.set("Cookie", init.cookie)
  return app.request(path, { ...init, headers })
}

function createPostBody(caption: string, images?: unknown) {
  return JSON.stringify(images === undefined ? { caption } : { caption, images })
}

describe("ảnh bài đăng", () => {
  let author: Session
  let other: Session

  beforeAll(async () => {
    author = await register("Người Đăng Ảnh", `post_img_${suffix}`)
    other = await register("Người Khác Ảnh", `post_img_other_${suffix}`)
  })

  test("POST /posts với 2 ảnh hợp lệ → 201, đúng thứ tự, khớp postSchema", async () => {
    const images = [`${CDN}/posts/${author.id}/a.jpg`, `${CDN}/posts/${author.id}/b.webp`]
    const res = await call("/api/v1/posts", {
      method: "POST",
      cookie: author.cookie,
      body: createPostBody("Bài có hai ảnh", images),
    })
    expect(res.status).toBe(201)

    const body = await res.json()
    expect(postSchema.safeParse(body).success).toBe(true)
    expect((body as { images: string[] }).images).toEqual(images)

    // GET chi tiết cũng trả ảnh (cùng `findPost`).
    const detail = await call(`/api/v1/posts/${(body as { id: string }).id}`)
    expect(detail.status).toBe(200)
    expect((await detail.json()) as { images: string[] }).toMatchObject({ images })
  })

  test("URL ngoài prefix bucket → 400", async () => {
    const res = await call("/api/v1/posts", {
      method: "POST",
      cookie: author.cookie,
      body: createPostBody("Ảnh ngoài", ["https://evil.test/x.jpg"]),
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      message: "Ảnh không hợp lệ hoặc không thuộc tài khoản của bạn",
    })
  })

  test("URL thuộc thư mục user khác → 400", async () => {
    const res = await call("/api/v1/posts", {
      method: "POST",
      cookie: author.cookie,
      body: createPostBody("Ảnh người khác", [`${CDN}/posts/${other.id}/x.jpg`]),
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      message: "Ảnh không hợp lệ hoặc không thuộc tài khoản của bạn",
    })
  })

  test("quá 4 ảnh → 400", async () => {
    const images = Array.from({ length: 5 }, (_, i) => `${CDN}/posts/${author.id}/${i}.jpg`)
    const res = await call("/api/v1/posts", {
      method: "POST",
      cookie: author.cookie,
      body: createPostBody("Quá nhiều ảnh", images),
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ message: "Tối đa 4 ảnh mỗi bài đăng" })
  })

  test("trùng URL trong cùng request → 400", async () => {
    const url = `${CDN}/posts/${author.id}/same.jpg`
    const res = await call("/api/v1/posts", {
      method: "POST",
      cookie: author.cookie,
      body: createPostBody("Ảnh trùng", [url, url]),
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ message: "Ảnh bị trùng trong bài đăng" })
  })

  test("URL traversal `posts/<uid>/../places/x.jpg` → 400", async () => {
    const res = await call("/api/v1/posts", {
      method: "POST",
      cookie: author.cookie,
      body: createPostBody("Traversal", [`${CDN}/posts/${author.id}/../places/x.jpg`]),
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      message: "Ảnh không hợp lệ hoặc không thuộc tài khoản của bạn",
    })
  })

  test("subdomain khác của domain CDN → 400", async () => {
    const res = await call("/api/v1/posts", {
      method: "POST",
      cookie: author.cookie,
      body: createPostBody("Subdomain lạ", [
        `https://evil.cdn.rendez.test/posts/${author.id}/x.jpg`,
      ]),
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      message: "Ảnh không hợp lệ hoặc không thuộc tài khoản của bạn",
    })
  })

  test("URL có query string → 400", async () => {
    const res = await call("/api/v1/posts", {
      method: "POST",
      cookie: author.cookie,
      body: createPostBody("URL có query", [`${CDN}/posts/${author.id}/x.jpg?token=abc`]),
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      message: "Ảnh không hợp lệ hoặc không thuộc tài khoản của bạn",
    })
  })

  test("URL có userinfo → 400", async () => {
    const res = await call("/api/v1/posts", {
      method: "POST",
      cookie: author.cookie,
      body: createPostBody("URL có userinfo", [
        `https://user:pass@cdn.rendez.test/posts/${author.id}/x.jpg`,
      ]),
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      message: "Ảnh không hợp lệ hoặc không thuộc tài khoản của bạn",
    })
  })

  test("URL dài hơn 2048 ký tự → 400", async () => {
    const longName = "a".repeat(2100)
    const res = await call("/api/v1/posts", {
      method: "POST",
      cookie: author.cookie,
      body: createPostBody("URL quá dài", [`${CDN}/posts/${author.id}/${longName}.jpg`]),
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ message: "URL ảnh quá dài" })
  })

  test("POST /posts không có images → images: []", async () => {
    const res = await call("/api/v1/posts", {
      method: "POST",
      cookie: author.cookie,
      body: createPostBody("Bài chỉ có chữ"),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(postSchema.safeParse(body).success).toBe(true)
    expect((body as { images: string[] }).images).toEqual([])
  })
})
