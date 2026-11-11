import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { notificationSchema } from "@rendez/schema"
import { startTestDb, stopTestDb } from "./helpers/pg"
import { registerVerifiedUser } from "./helpers/auth"

/**
 * Integration test T4.4 — job phát hiện địa điểm (A7.2).
 *
 * Bài chưa gắn địa điểm + caption khớp place CHƯA publish → sinh notification
 * `place-suggestion` đúng schema, chỉ 1 lần cho mỗi bài (idempotence), và
 * `postPlaceId` phản ánh trạng thái hiện tại của bài.
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma
let detectPlaceSuggestions: typeof import("../src/lib/suggestions-job").detectPlaceSuggestions

const suffix = Math.random().toString(36).slice(2, 8)

beforeAll(async () => {
  const url = await startTestDb()
  process.env.DATABASE_URL = url
  process.env.LOG_LEVEL = "error"
  process.env.NODE_ENV = "test"

  const { createApp } = await import("../src/app")
  prisma = (await import("../src/lib/prisma")).prisma
  detectPlaceSuggestions = (await import("../src/lib/suggestions-job")).detectPlaceSuggestions
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
  return registerVerifiedUser(app, prisma, { name, handle })
}

function call(path: string, init: RequestInit & { cookie?: string } = {}) {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("Content-Type", "application/json")
  if (init.cookie) headers.set("Cookie", init.cookie)
  return app.request(path, { ...init, headers })
}

describe("job phát hiện địa điểm", () => {
  let author: Session
  let unpublishedId = ""
  let unpublishedName = ""

  beforeAll(async () => {
    author = await register("Người Viết", `job_author_${suffix}`)
    // Seed bảo đảm ≥ 1 place chưa publish có tên dùng được (xem `pickUnpublishedIds`
    // trong scripts/seed.ts); nếu dataset có nhiều, chọn tên dài nhất để ổn định.
    const places = await prisma.place.findMany({
      where: { publishedAt: null, deletedAt: null },
      select: { id: true, name: true },
    })
    const place = places.sort((a, b) => b.name.length - a.name.length)[0]
    if (!place) throw new Error("Dataset seed không còn place chưa publish để test job")
    unpublishedId = place.id
    unpublishedName = place.name
  })

  test("bài khớp place chưa publish → có notification place-suggestion", async () => {
    const created = await call("/api/v1/posts", {
      method: "POST",
      cookie: author.cookie,
      body: JSON.stringify({ caption: `Ăn thử ${unpublishedName} ở Đà Nẵng thấy rất ngon` }),
    })
    expect(created.status).toBe(201)
    const postId = ((await created.json()) as { id: string }).id

    const count = await detectPlaceSuggestions(postId)
    expect(count).toBe(1)

    const res = await call("/api/v1/notifications", { cookie: author.cookie })
    expect(res.status).toBe(200)
    const page = (await res.json()) as { items: unknown[] }
    for (const item of page.items) {
      expect(notificationSchema.safeParse(item).success).toBe(true)
    }

    const suggestion = page.items.find(
      (item) => (item as { kind: string }).kind === "place-suggestion",
    ) as
      | {
          postId: string
          postCaption: string
          postPlaceId: string | null
          suggestions: Array<{ place: { id: string; isPublished: boolean }; reason: string }>
        }
      | undefined
    expect(suggestion).toBeDefined()
    expect(suggestion!.postId).toBe(postId)
    expect(suggestion!.postPlaceId).toBeNull()
    expect(suggestion!.suggestions.length).toBeGreaterThan(0)
    expect(suggestion!.suggestions.every((item) => item.place.isPublished === false)).toBe(true)
    expect(suggestion!.suggestions.some((item) => item.place.id === unpublishedId)).toBe(true)
  })

  test("chạy lại job không tạo thông báo trùng (idempotence)", async () => {
    const before = await prisma.notification.count({
      where: { userId: author.id, type: "place_suggestion" },
    })
    const count = await detectPlaceSuggestions()
    expect(count).toBe(0)
    const after = await prisma.notification.count({
      where: { userId: author.id, type: "place_suggestion" },
    })
    expect(after).toBe(before)
  })

  test("hai worker chạy song song chỉ tạo 1 thông báo (khoá post_id)", async () => {
    const created = await call("/api/v1/posts", {
      method: "POST",
      cookie: author.cookie,
      body: JSON.stringify({ caption: `Chạy đua ghé ${unpublishedName} lần nữa` }),
    })
    expect(created.status).toBe(201)
    const postId = ((await created.json()) as { id: string }).id

    // Hai lần gọi đồng thời: một lần ghi notification + dấu, lần kia (nếu đọc
    // trước khi dấu xuất hiện) phải nhận P2002 và bỏ qua thay vì ném lỗi.
    const [first, second] = await Promise.all([
      detectPlaceSuggestions(postId),
      detectPlaceSuggestions(postId),
    ])
    expect(first + second).toBe(1)

    const notifications = await prisma.notification.count({
      where: {
        userId: author.id,
        type: "place_suggestion",
        payload: { path: ["postId"], equals: postId },
      },
    })
    expect(notifications).toBe(1)
  })

  test("bài đã gắn địa điểm không bị job quét", async () => {
    const place = await prisma.place.findFirst({
      where: { publishedAt: { not: null }, deletedAt: null },
      select: { id: true, name: true },
    })
    const created = await call("/api/v1/posts", {
      method: "POST",
      cookie: author.cookie,
      body: JSON.stringify({ caption: `Bài có địa điểm ${place!.name}`, placeId: place!.id }),
    })
    expect(created.status).toBe(201)
    const postId = ((await created.json()) as { id: string }).id

    const count = await detectPlaceSuggestions(postId)
    expect(count).toBe(0)
    const marker = await prisma.placeSuggestionNotification.findUnique({ where: { postId } })
    expect(marker).toBeNull()
  })

  test("gắn địa điểm vào bài → thông báo đề xuất được đánh dấu đã đọc", async () => {
    const created = await call("/api/v1/posts", {
      method: "POST",
      cookie: author.cookie,
      body: JSON.stringify({ caption: `Lần nữa ghé ${unpublishedName} buổi tối` }),
    })
    const postId = ((await created.json()) as { id: string }).id
    await detectPlaceSuggestions(postId)

    const attach = await call(`/api/v1/posts/${postId}/place`, {
      method: "PATCH",
      cookie: author.cookie,
      body: JSON.stringify({ placeId: unpublishedId }),
    })
    expect(attach.status).toBe(200)

    const notifications = await call("/api/v1/notifications", { cookie: author.cookie })
    const page = (await notifications.json()) as {
      items: Array<{ kind: string; postId?: string; read: boolean }>
    }
    const related = page.items.filter(
      (item) => item.kind === "place-suggestion" && item.postId === postId,
    )
    expect(related.length).toBe(1)
    expect(related[0]!.read).toBe(true)
  })
})
