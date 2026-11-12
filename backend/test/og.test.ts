import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"
import { registerVerifiedUser } from "./helpers/auth"

/**
 * Test OG preview (`/og/place/:id`, `/og/post/:id`) — unit cho helper dựng
 * HTML (escape, whitelist ảnh, cắt caption) + integration trên Postgres thật.
 */

let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma
let og: typeof import("../src/lib/og")

const suffix = Math.random().toString(36).slice(2, 8)

beforeAll(async () => {
  const url = await startTestDb()
  process.env.DATABASE_URL = url
  process.env.LOG_LEVEL = "error"
  process.env.NODE_ENV = "test"

  const { createApp } = await import("../src/app")
  prisma = (await import("../src/lib/prisma")).prisma
  og = await import("../src/lib/og")
  app = createApp()
}, 180_000)

afterAll(async () => {
  await prisma?.$disconnect()
  await stopTestDb()
}, 60_000)

/** GET với UA bot — nginx sẽ proxy kèm UA gốc, test giả lập đúng điều đó. */
function getAsBot(path: string, userAgent = "facebookexternalhit/1.1") {
  return app.request(path, { headers: { "User-Agent": userAgent } })
}

describe("unit — dựng HTML meta OG", () => {
  test("escape title/description chứa <script>, dấu nháy, &, emoji", async () => {
    const html = await og.renderOgHtml({
      title: `<script>alert("x")</script> & 'quote' 🍜`,
      description: `Mô tả & "nội dung" <b>đậm</b> 'ok' 😀`,
      path: "/discover/test",
      image: null,
      type: "website",
      version: 1,
    })

    // Không có ký tự thô trong output — mọi thứ phải đã escape.
    expect(html).not.toContain(`<script>`)
    expect(html).not.toContain(`<b>`)
    expect(html).toContain("&lt;script&gt;")
    expect(html).toContain("&quot;")
    expect(html).toContain("&#39;")
    expect(html).toContain("&amp;")
    // Emoji (an toàn, không cần escape) vẫn nguyên vẹn.
    expect(html).toContain("🍜")
  })

  test('id chứa `"` và `<` không xuất hiện nguyên văn trong og:url', async () => {
    const html = await og.renderOgHtml(og.notFoundOgMeta(`/discover/"x<y`))
    expect(html).not.toContain(`"x<y`)
    expect(html).toContain("&quot;x&lt;y")
  })

  test("caption dài cắt đúng ≤160 tại khoảng trắng, không cắt giữa emoji", () => {
    // Chuỗi 200 ký tự có khoảng trắng ở giữa.
    const long = "a".repeat(100) + " " + "b".repeat(99)
    const cut = og.truncateDescription(long)
    expect(cut.length).toBeLessThanOrEqual(161) // 160 + dấu "…"
    expect(cut.endsWith("…")).toBe(true)
    expect(cut).toBe(`${"a".repeat(100)}…`)

    // Ranh giới 160 rơi đúng vào giữa cặp surrogate của emoji → phải bỏ nửa
    // đầu thay vì để lại ký tự lỗi.
    const emojiCut = og.truncateDescription("a".repeat(159) + "😀")
    expect(emojiCut).toBe(`${"a".repeat(159)}…`)
  })

  test("URL ảnh javascript: bị loại → fallback og-image; /data/ được tuyệt đối hoá", () => {
    expect(og.safeImageUrl("javascript:alert(1)")).toBeNull()
    expect(og.safeImageUrl("data:text/html,x")).toBeNull()

    // Prefix lỏng (`startsWith(APP_ORIGIN)`) từng cho phép domain mượn origin:
    // `localhost:5173.evil.com` — phải bị loại để không rơi về ảnh evil.
    expect(og.safeImageUrl("http://localhost:5173.evil.com/x.png")).toBeNull()
    // Còn APP_ORIGIN đúng nguyên vẹn hoặc kèm đường dẫn thì hợp lệ.
    expect(og.safeImageUrl("http://localhost:5173")).toBe("http://localhost:5173")
    expect(og.safeImageUrl("http://localhost:5173/data/x.png")).toBe(
      "http://localhost:5173/data/x.png",
    )

    const fallback = og.absoluteImageUrl("javascript:alert(1)", 7)
    expect(fallback).toBe(`http://localhost:5173/og-image.png?v=7`)

    const relative = og.absoluteImageUrl("/data/x.png", 123)
    expect(relative).toBe(`http://localhost:5173/data/x.png?v=123`)

    const absolute = og.absoluteImageUrl("https://cdn.example/a.png", 42)
    expect(absolute).toBe(`https://cdn.example/a.png?v=42`)
  })
})

describe("integration — GET /og/place/:id", () => {
  test("quán published trả 200 HTML với og:title là tên quán", async () => {
    const place = await prisma.place.findFirst({
      where: { publishedAt: { not: null }, deletedAt: null },
      select: { id: true, name: true },
    })
    expect(place).not.toBeNull()

    const res = await getAsBot(`/api/v1/og/place/${place!.id}`)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/html")
    expect(res.headers.get("cache-control")).toBe("public, max-age=600")

    const html = await res.text()
    expect(html).toContain(`og:title" content="${place!.name}"`)
    expect(html).toContain(`og:url" content="http://localhost:5173/discover/${place!.id}"`)
    expect(html).toContain(`og:site_name" content="Rendez"`)
  })

  test("quán chưa publish → 404 + meta mặc định", async () => {
    const created = await prisma.place.create({
      data: {
        id: `og-unpublished-${suffix}`,
        name: "Quán Chưa Publish",
        address: "1 Đường Test",
        category: "restaurant",
      },
      select: { id: true },
    })

    const res = await getAsBot(`/api/v1/og/place/${created.id}`)
    expect(res.status).toBe(404)
    const html = await res.text()
    expect(html).toContain(`og:title" content="Rendez — Ăn gì hôm nay ở Đà Nẵng?"`)
    expect(html).not.toContain("Quán Chưa Publish")
  })

  test("id sai format → 404 HTML (không phải JSON lỗi)", async () => {
    const res = await getAsBot(`/api/v1/og/place/"x<y`)
    expect(res.status).toBe(404)
    expect(await res.text()).toContain("<!doctype html>")
  })
})

describe("integration — GET /og/post/:id", () => {
  let author: Awaited<ReturnType<typeof registerVerifiedUser>>

  beforeAll(async () => {
    author = await registerVerifiedUser(app, prisma, {
      name: "Tác Giả OG",
      handle: `tac_gia_og_${suffix}`,
    })
  })

  async function createPost(input: {
    caption: string
    placeId?: string
    images?: string[]
  }): Promise<string> {
    const post = await prisma.post.create({
      data: { authorId: author.id, caption: input.caption, placeId: input.placeId ?? null },
      select: { id: true },
    })
    if (input.images && input.images.length > 0) {
      await prisma.postImage.createMany({
        data: input.images.map((url, index) => ({ postId: post.id, url, position: index })),
      })
    }
    return post.id
  }

  test("bài có ảnh → og:image là ảnh đầu tiên", async () => {
    const id = await createPost({
      caption: "Bánh xèo Đà Nẵng ngon tuyệt",
      images: ["https://cdn.example/first.jpg", "https://cdn.example/second.jpg"],
    })
    const res = await getAsBot(`/api/v1/og/post/${id}`)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain(`og:image" content="https://cdn.example/first.jpg?v=`)
    expect(html).toContain(`og:type" content="article"`)
    expect(html).toContain(`og:title" content="Tác Giả OG kiểm tra quán"`)
  })

  test("bài không ảnh, gắn quán có ảnh → og:image là ảnh quán", async () => {
    const placeWithImage = await prisma.place.findFirst({
      where: { publishedAt: { not: null }, deletedAt: null, images: { some: {} } },
      select: { id: true },
    })
    expect(placeWithImage).not.toBeNull()

    const id = await createPost({ caption: "Check-in quán", placeId: placeWithImage!.id })
    const res = await getAsBot(`/api/v1/og/post/${id}`)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain(`og:title" content="Bài viết tại `)
    expect(html).not.toContain(`og:image" content="http://localhost:5173/og-image.png?v=`)
  })

  test("bài không ảnh, không quán → og:image là ảnh mặc định", async () => {
    const id = await createPost({ caption: "Bài trơn" })
    const res = await getAsBot(`/api/v1/og/post/${id}`)
    expect(res.status).toBe(200)
    expect(await res.text()).toContain(`og:image" content="http://localhost:5173/og-image.png?v=`)
  })

  test("id sai uuid → 404 HTML", async () => {
    const res = await getAsBot(`/api/v1/og/post/khong-phai-uuid`)
    expect(res.status).toBe(404)
    expect(await res.text()).toContain("<!doctype html>")
  })
})
