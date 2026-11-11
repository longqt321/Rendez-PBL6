import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { collectionSchema, collectionSummarySchema, pageSchema, placeSchema } from "@rendez/schema"
import { startTestDb, stopTestDb } from "./helpers/pg"

/**
 * Integration test Phase 5 — bộ sưu tập trên Postgres thật (A7.7).
 *
 * CRUD, thêm/bớt địa điểm idempotent + đẩy cuối, `?placeId=` nhúng
 * `containsPlace`, cấm tự like (400), private của người khác 404, sửa/xoá chỉ
 * owner (403), và `GET /places/saved` gộp bộ sưu tập của chính mình.
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma

const summaryPageSchema = pageSchema(collectionSummarySchema)
const placePageSchema = pageSchema(placeSchema)

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

describe("bộ sưu tập", () => {
  let owner: Session
  let other: Session
  let placeA = ""
  let placeB = ""
  let collectionId = ""

  beforeAll(async () => {
    owner = await register("Chủ Bộ Sưu Tập", `bst_owner_${suffix}`)
    other = await register("Người Khác", `bst_other_${suffix}`)
    const places = await prisma.place.findMany({
      where: { publishedAt: { not: null }, deletedAt: null },
      select: { id: true },
      orderBy: { id: "asc" },
      take: 2,
    })
    placeA = places[0]!.id
    placeB = places[1]!.id
  })

  test("GET /collections cần đăng nhập", async () => {
    const res = await call("/api/v1/collections")
    expect(res.status).toBe(401)
  })

  test("POST /collections tạo rỗng, trả Collection khớp schema", async () => {
    const res = await call("/api/v1/collections", {
      method: "POST",
      cookie: owner.cookie,
      body: JSON.stringify({ name: "Quán ruột", description: "Đi mỗi tuần" }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as unknown
    expect(collectionSchema.safeParse(body).success).toBe(true)
    const collection = body as {
      id: string
      placeIds: string[]
      isPrivate: boolean
      isMine: boolean
    }
    expect(collection.placeIds).toEqual([])
    expect(collection.isPrivate).toBe(false)
    expect(collection.isMine).toBe(true)
    collectionId = collection.id
  })

  test("POST /collections từ chối tên rỗng", async () => {
    const res = await call("/api/v1/collections", {
      method: "POST",
      cookie: owner.cookie,
      body: JSON.stringify({ name: "   " }),
    })
    expect(res.status).toBe(400)
  })

  test("GET /collections trả Page<CollectionSummary> của chính mình", async () => {
    const res = await call("/api/v1/collections", { cookie: owner.cookie })
    expect(res.status).toBe(200)
    const body = (await res.json()) as unknown
    expect(summaryPageSchema.safeParse(body).success).toBe(true)
    const page = body as { items: Array<{ id: string; placeCount: number }> }
    expect(page.items.some((item) => item.id === collectionId)).toBe(true)
  })

  test("PATCH /collections/:id/places thêm idempotent, đẩy cuối (A7.7)", async () => {
    const add = async (placeId: string) =>
      call(`/api/v1/collections/${collectionId}/places`, {
        method: "PATCH",
        cookie: owner.cookie,
        body: JSON.stringify({ placeId, member: true }),
      })

    const first = await add(placeA)
    expect(first.status).toBe(200)
    expect(((await first.json()) as { placeIds: string[] }).placeIds).toEqual([placeA])

    // Thêm lại → không nhân đôi, không đổi thứ tự.
    const again = await add(placeA)
    expect(((await again.json()) as { placeIds: string[] }).placeIds).toEqual([placeA])

    const second = await add(placeB)
    expect(((await second.json()) as { placeIds: string[] }).placeIds).toEqual([placeA, placeB])

    // Bớt place không có trong danh sách → no-op.
    const removeMissing = await call(`/api/v1/collections/${collectionId}/places`, {
      method: "PATCH",
      cookie: owner.cookie,
      body: JSON.stringify({ placeId: "khong-ton-tai-999", member: false }),
    })
    expect(removeMissing.status).toBe(404)
  })

  test("PATCH places từ chối place không tồn tại, người khác 403", async () => {
    const missing = await call(`/api/v1/collections/${collectionId}/places`, {
      method: "PATCH",
      cookie: owner.cookie,
      body: JSON.stringify({ placeId: "khong-ton-tai-999", member: true }),
    })
    expect(missing.status).toBe(404)

    const forbidden = await call(`/api/v1/collections/${collectionId}/places`, {
      method: "PATCH",
      cookie: other.cookie,
      body: JSON.stringify({ placeId: placeA, member: true }),
    })
    expect(forbidden.status).toBe(403)
  })

  test("?placeId= nhúng containsPlace, không có query thì không có trường (A6.5)", async () => {
    const withQuery = await call(`/api/v1/collections?placeId=${placeA}`, { cookie: owner.cookie })
    const page = (await withQuery.json()) as {
      items: Array<{ id: string; containsPlace?: boolean }>
    }
    const mine = page.items.find((item) => item.id === collectionId)
    expect(mine?.containsPlace).toBe(true)

    const withoutQuery = await call("/api/v1/collections", { cookie: owner.cookie })
    const plain = (await withoutQuery.json()) as {
      items: Array<{ id: string; containsPlace?: boolean }>
    }
    expect(plain.items.find((item) => item.id === collectionId)).not.toHaveProperty("containsPlace")
  })

  test("cấm tự like bộ sưu tập của mình (400)", async () => {
    const res = await call(`/api/v1/collections/${collectionId}/like`, {
      method: "POST",
      cookie: owner.cookie,
    })
    expect(res.status).toBe(400)
  })

  test("người khác like/bỏ like idempotent", async () => {
    const like = await call(`/api/v1/collections/${collectionId}/like`, {
      method: "POST",
      cookie: other.cookie,
    })
    expect(like.status).toBe(200)
    const liked = (await like.json()) as { likeCount: number; likedByMe: boolean }
    expect(liked.likeCount).toBe(1)
    expect(liked.likedByMe).toBe(true)

    const again = await call(`/api/v1/collections/${collectionId}/like`, {
      method: "POST",
      cookie: other.cookie,
    })
    expect(((await again.json()) as { likeCount: number }).likeCount).toBe(1)

    const unlike = await call(`/api/v1/collections/${collectionId}/like`, {
      method: "DELETE",
      cookie: other.cookie,
    })
    expect(((await unlike.json()) as { likeCount: number }).likeCount).toBe(0)
  })

  test("private của người khác → 404, chủ vẫn xem được", async () => {
    const created = await call("/api/v1/collections", {
      method: "POST",
      cookie: owner.cookie,
      body: JSON.stringify({ name: "Riêng tư", isPrivate: true }),
    })
    const { id } = (await created.json()) as { id: string }

    const stranger = await call(`/api/v1/collections/${id}`, { cookie: other.cookie })
    expect(stranger.status).toBe(404)

    const mine = await call(`/api/v1/collections/${id}`, { cookie: owner.cookie })
    expect(mine.status).toBe(200)

    // Like bộ private của người khác cũng 404 (giấu tồn tại).
    const like = await call(`/api/v1/collections/${id}/like`, {
      method: "POST",
      cookie: other.cookie,
    })
    expect(like.status).toBe(404)
  })

  test("PATCH /collections/:id chỉ owner (403), cập nhật một phần", async () => {
    const forbidden = await call(`/api/v1/collections/${collectionId}`, {
      method: "PATCH",
      cookie: other.cookie,
      body: JSON.stringify({ name: "Chiếm đoạt" }),
    })
    expect(forbidden.status).toBe(403)

    const ok = await call(`/api/v1/collections/${collectionId}`, {
      method: "PATCH",
      cookie: owner.cookie,
      body: JSON.stringify({ description: "Mô tả mới" }),
    })
    expect(ok.status).toBe(200)
    const updated = (await ok.json()) as { name: string; description: string }
    expect(updated.name).toBe("Quán ruột")
    expect(updated.description).toBe("Mô tả mới")
  })

  test("GET /places/saved gộp bộ sưu tập của mình, loại trùng, khớp schema", async () => {
    const res = await call("/api/v1/places/saved", { cookie: owner.cookie })
    expect(res.status).toBe(200)
    const body = (await res.json()) as unknown
    expect(placePageSchema.safeParse(body).success).toBe(true)
    const page = body as { items: Array<{ id: string }> }
    const ids = page.items.map((item) => item.id)
    expect(ids).toContain(placeA)
    expect(ids).toContain(placeB)
    expect(new Set(ids).size).toBe(ids.length)

    // Người khác chưa lưu gì → rỗng.
    const otherRes = await call("/api/v1/places/saved", { cookie: other.cookie })
    const otherPage = (await otherRes.json()) as { items: unknown[] }
    expect(otherPage.items).toHaveLength(0)
  })

  test("GET /places/saved cần đăng nhập", async () => {
    const res = await call("/api/v1/places/saved")
    expect(res.status).toBe(401)
  })

  test("DELETE /collections/:id chỉ owner (403), trả true", async () => {
    const forbidden = await call(`/api/v1/collections/${collectionId}`, {
      method: "DELETE",
      cookie: other.cookie,
    })
    expect(forbidden.status).toBe(403)

    const ok = await call(`/api/v1/collections/${collectionId}`, {
      method: "DELETE",
      cookie: owner.cookie,
    })
    expect(ok.status).toBe(200)
    expect(await ok.json()).toBe(true)

    const gone = await call(`/api/v1/collections/${collectionId}`, { cookie: owner.cookie })
    expect(gone.status).toBe(404)

    // Xoá MỀM: dòng vẫn còn trong DB (deleted_at), không mất dữ liệu.
    const row = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { deletedAt: true },
    })
    expect(row?.deletedAt).not.toBeNull()
  })
})
