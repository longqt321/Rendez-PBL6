import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { pageSchema, userProfileSchema, userSuggestionsSchema } from "@rendez/schema"
import { startTestDb, stopTestDb } from "./helpers/pg"
import { registerVerifiedUser } from "./helpers/auth"

/**
 * Integration test T2.6 — `GET /users?q=` tìm không dấu, trả `Page<UserProfile>`.
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

const userPageSchema = pageSchema(userProfileSchema)

/** Hậu tố ngẫu nhiên — các file test dùng chung một container. */
const suffix = Math.random().toString(36).slice(2, 8)

describe("GET /users", () => {
  test("trả Page<UserProfile> khớp schema", async () => {
    const res = await app.request("/api/v1/users")
    expect(res.status).toBe(200)
    expect(userPageSchema.safeParse(await res.json()).success).toBe(true)
  })

  test("meta có totalResults là COUNT thật (không phải số item trong trang)", async () => {
    const res = await app.request("/api/v1/users")
    const body = (await res.json()) as {
      items: unknown[]
      meta: { tookMs: number; cacheHit: boolean; totalResults: number }
    }
    expect(Number.isInteger(body.meta.tookMs)).toBe(true)
    expect(body.meta.cacheHit).toBe(false)
    expect(body.meta.totalResults).toBeGreaterThanOrEqual(body.items.length)
    expect(body.meta.totalResults).toBe(await prisma.user.count({ where: { deletedAt: null } }))
  })

  test("tìm không dấu khớp tên có dấu", async () => {
    // Tạo user có tên có dấu để tìm.
    await app.request("/api/v1/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Minh Anh",
        email: `minhanh-${suffix}@rendez.test`,
        password: "password123",
        handle: `minh_anh_${suffix}`,
      }),
    })

    const res = await app.request("/api/v1/users?q=minh anh")
    const body = (await res.json()) as {
      items: { name: string; handle: string; isMe: boolean }[]
      next: string | null
    }

    expect(userPageSchema.safeParse(body).success).toBe(true)
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).toMatchObject({
      name: "Minh Anh",
      handle: `minh_anh_${suffix}`,
      isMe: false,
    })
  })

  test("tìm có dấu vẫn khớp (chuẩn hoá 2 phía như mock)", async () => {
    await app.request("/api/v1/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": `10.9.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`,
      },
      body: JSON.stringify({
        name: "Ngọc Ánh",
        email: `ngocanh-${suffix}@rendez.test`,
        password: "password123",
        handle: `ngoc_anh_${suffix}`,
      }),
    })

    const res = await app.request(`/api/v1/users?q=${encodeURIComponent("ngọc ánh")}`)
    const body = (await res.json()) as { items: { name: string }[] }

    expect(body.items.map((item) => item.name)).toContain("Ngọc Ánh")
  })

  test("q không khớp ai trả trang rỗng", async () => {
    const res = await app.request("/api/v1/users?q=zzz-khong-co")
    const body = (await res.json()) as { items: unknown[]; next: string | null }
    expect(body.items).toHaveLength(0)
    expect(body.next).toBeNull()
  })

  test("cursor keyset: trang sau chỉ gồm người cũ hơn mốc cursor", async () => {
    // Dựng cursor từ dữ liệu thật (không tạo thêm user — route đăng ký có rate limit).
    const rows = await prisma.$queryRaw<{ id: string; created_at: Date }[]>`
      SELECT id, created_at FROM users ORDER BY created_at DESC, id DESC LIMIT 5
    `
    expect(rows.length).toBeGreaterThan(0)
    const pivot = rows[rows.length - 1]!
    const cursor = Buffer.from(`${pivot.created_at.toISOString()}|${pivot.id}`, "utf8").toString(
      "base64url",
    )

    const res = await app.request(`/api/v1/users?cursor=${cursor}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      items: { id: string; createdAt: string }[]
      next: string | null
    }
    expect(userPageSchema.safeParse(body).success).toBe(true)
    for (const item of body.items) {
      expect(item.id).not.toBe(pivot.id)
      expect(new Date(item.createdAt).getTime()).toBeLessThanOrEqual(pivot.created_at.getTime())
    }
  })

  test("đăng nhập rồi tìm: isMe đúng cho chính mình", async () => {
    // IP riêng để không đụng rate limit đăng ký của các test trước.
    const { cookie } = await registerVerifiedUser(app, prisma, {
      name: "Tôi Tìm Kiếm",
      email: `me_search_${suffix}@rendez.test`,
      handle: `me_search_${suffix}`,
      headers: { "X-Forwarded-For": "10.77.0.9" },
    })

    const res = await app.request(`/api/v1/users?q=me_search_${suffix}`, {
      headers: { Cookie: cookie },
    })
    const body = (await res.json()) as { items: { handle: string; isMe: boolean }[] }
    expect(body.items).toHaveLength(1)
    expect(body.items[0]?.isMe).toBe(true)
  })
})

/**
 * `GET /users/suggestions` — integration trên Postgres thật.
 *
 * Kiểm: 401 guest, header CHÍNH XÁC `Cache-Control: no-store`, shape khớp
 * schema, loại chính mình/người đã follow/người đã xoá mềm, `reason` đúng và
 * **`post_saves` không được tính** vào "Cùng quan tâm" (BLOCKER B1).
 */
describe("GET /users/suggestions", () => {
  let viewer: { cookie: string; id: string }
  let shared: { cookie: string; id: string }
  let mutual: { cookie: string; id: string }
  let followed: { cookie: string; id: string }
  let removed: { cookie: string; id: string }

  /** IP riêng cho mỗi lần đăng ký — né rate limit đăng ký dùng chung container. */
  const ip = (index: number) => ({ "X-Forwarded-For": `10.88.0.${index}` })

  beforeAll(async () => {
    viewer = await registerVerifiedUser(app, prisma, {
      name: "Người Xem Gợi Ý",
      handle: `sug_viewer_${suffix}`,
      headers: ip(1),
    })
    shared = await registerVerifiedUser(app, prisma, {
      name: "Quán Chung",
      handle: `sug_shared_${suffix}`,
      headers: ip(2),
    })
    mutual = await registerVerifiedUser(app, prisma, {
      name: "Bạn Chung",
      handle: `sug_mutual_${suffix}`,
      headers: ip(3),
    })
    followed = await registerVerifiedUser(app, prisma, {
      name: "Đã Theo Dõi",
      handle: `sug_followed_${suffix}`,
      headers: ip(4),
    })
    removed = await registerVerifiedUser(app, prisma, {
      name: "Đã Xoá",
      handle: `sug_removed_${suffix}`,
      headers: ip(5),
    })

    // Tín hiệu công khai: viewer + `shared` cùng review một quán đã publish.
    const place = await prisma.place.findFirst({
      where: { publishedAt: { not: null }, deletedAt: null },
      select: { id: true },
      orderBy: { id: "asc" },
    })
    const placeId = place!.id
    await prisma.review.create({
      data: { placeId, authorId: viewer.id, tier: "must_try", content: "Rất ngon" },
    })
    await prisma.review.create({
      data: { placeId, authorId: shared.id, tier: "good", content: "Ổn" },
    })

    // Tín hiệu RIÊNG TƯ: cả hai cùng lưu một bài — không được tính vào quán chung.
    const post = await prisma.post.findFirst({
      where: { deletedAt: null },
      select: { id: true },
      orderBy: { id: "asc" },
    })
    if (post) {
      await prisma.postSave.createMany({
        data: [
          { postId: post.id, userId: viewer.id },
          { postId: post.id, userId: shared.id },
        ],
        skipDuplicates: true,
      })
    }

    // viewer → followed → mutual: `mutual` có 1 người theo dõi chung.
    await prisma.follow.createMany({
      data: [
        { followerId: viewer.id, followingId: followed.id },
        { followerId: followed.id, followingId: mutual.id },
      ],
      skipDuplicates: true,
    })

    // `removed` có tín hiệu mạnh nhưng đã xoá mềm → phải bị loại.
    await prisma.review.create({
      data: { placeId, authorId: removed.id, tier: "ok", content: "Tạm" },
    })
    await prisma.user.update({ where: { id: removed.id }, data: { deletedAt: new Date() } })
  })

  test("guest nhận 401", async () => {
    const res = await app.request("/api/v1/users/suggestions")
    expect(res.status).toBe(401)
  })

  test("trả shape đúng, header chính xác `Cache-Control: no-store`", async () => {
    const res = await app.request("/api/v1/users/suggestions", {
      headers: { Cookie: viewer.cookie },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get("cache-control")).toBe("no-store")
    expect(userSuggestionsSchema.safeParse(await res.json()).success).toBe(true)
  })

  test("có meta vận hành: tookMs/totalResults thật, cacheHit false", async () => {
    const res = await app.request("/api/v1/users/suggestions", {
      headers: { Cookie: viewer.cookie },
    })
    const body = (await res.json()) as {
      items: unknown[]
      next: string | null
      meta: { tookMs: number; cacheHit: boolean; totalResults: number }
    }
    expect(body.next).toBeNull()
    expect(Number.isInteger(body.meta.tookMs)).toBe(true)
    expect(body.meta.tookMs).toBeGreaterThanOrEqual(0)
    // Không có cache ứng dụng cho gợi ý người → false, không bịa.
    expect(body.meta.cacheHit).toBe(false)
    expect(body.meta.totalResults).toBe(body.items.length)
  })

  test("loại chính mình, người đã theo dõi và người đã xoá mềm", async () => {
    const res = await app.request("/api/v1/users/suggestions", {
      headers: { Cookie: viewer.cookie },
    })
    const body = (await res.json()) as {
      items: { user: { id: string; followedByMe: boolean } }[]
    }
    const ids = body.items.map((item) => item.user.id)

    expect(body.items.length).toBeLessThanOrEqual(5)
    expect(ids).not.toContain(viewer.id)
    expect(ids).not.toContain(followed.id)
    expect(ids).not.toContain(removed.id)
    for (const item of body.items) expect(item.user.followedByMe).toBe(false)
  })

  test("reason đúng: quán chung từ nguồn công khai, bạn chung", async () => {
    const res = await app.request("/api/v1/users/suggestions", {
      headers: { Cookie: viewer.cookie },
    })
    const body = (await res.json()) as {
      items: { user: { id: string }; reason: string }[]
    }
    const reasonById = new Map(body.items.map((item) => [item.user.id, item.reason]))

    // `shared` chỉ có 1 quán chung công khai — post_save chung KHÔNG được cộng
    // thành 2 (BLOCKER B1: hành vi lưu là riêng tư).
    expect(reasonById.get(shared.id)).toBe("Cùng quan tâm 1 quán")
    expect(reasonById.get(mutual.id)).toBe("Có 1 người theo dõi chung")
  })
})
