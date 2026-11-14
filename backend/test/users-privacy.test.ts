import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { pageSchema, userProfileSchema } from "@rendez/schema"
import { startTestDb, stopTestDb } from "./helpers/pg"
import { registerVerifiedUser } from "./helpers/auth"

/**
 * Integration test quyền riêng tư hồ sơ (`privateProfile`) — Postgres thật.
 *
 * Hồ sơ bật `privateProfile`: bài đăng và bộ sưu tập chỉ chủ sở hữu xem được
 * (403 cho người khác và cho khách). Hồ sơ cơ bản (tên, avatar, handle) vẫn
 * công khai. Hồ sơ công khai không bị ảnh hưởng.
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

/** IP riêng cho mỗi lần đăng ký — né rate limit đăng ký dùng chung container. */
const ip = (index: number) => ({ "X-Forwarded-For": `10.66.0.${index}` })

let owner: { cookie: string; id: string }
let stranger: { cookie: string; id: string }
let publicUser: { cookie: string; id: string }

const OWNER_HANDLE = `privacy_owner_${suffix}`
const STRANGER_HANDLE = `privacy_stranger_${suffix}`
const PUBLIC_HANDLE = `privacy_public_${suffix}`

beforeAll(async () => {
  owner = await registerVerifiedUser(app, prisma, {
    name: "Chủ Riêng Tư",
    handle: OWNER_HANDLE,
    headers: ip(1),
  })
  stranger = await registerVerifiedUser(app, prisma, {
    name: "Người Lạ",
    handle: STRANGER_HANDLE,
    headers: ip(2),
  })
  publicUser = await registerVerifiedUser(app, prisma, {
    name: "Người Công Khai",
    handle: PUBLIC_HANDLE,
    headers: ip(3),
  })

  // Bật chế độ riêng tư cho `owner` sau khi đăng ký (đăng ký không nhận cờ này).
  await prisma.user.update({ where: { id: owner.id }, data: { privateProfile: true } })

  // Bộ sưu tập công khai của mỗi người — để kiểm chủ vẫn thấy dữ liệu của mình.
  await prisma.collection.createMany({
    data: [
      { ownerId: owner.id, name: "Bộ sưu tập riêng tư" },
      { ownerId: publicUser.id, name: "Bộ sưu tập công khai" },
    ],
  })
})

describe("hồ sơ riêng tư — bộ sưu tập", () => {
  test("chính chủ xem được bộ sưu tập của mình", async () => {
    const res = await app.request(`/api/v1/users/${OWNER_HANDLE}/collections`, {
      headers: { Cookie: owner.cookie },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: { name: string }[] }
    expect(body.items.map((item) => item.name)).toContain("Bộ sưu tập riêng tư")
  })

  test("người khác đã đăng nhập nhận 403", async () => {
    const res = await app.request(`/api/v1/users/${OWNER_HANDLE}/collections`, {
      headers: { Cookie: stranger.cookie },
    })
    expect(res.status).toBe(403)
    const body = (await res.json()) as { message: string }
    expect(body.message).toBe("Hồ sơ này ở chế độ riêng tư")
  })

  test("khách chưa đăng nhập cũng nhận 403", async () => {
    const res = await app.request(`/api/v1/users/${OWNER_HANDLE}/collections`)
    expect(res.status).toBe(403)
  })
})

describe("hồ sơ riêng tư — bài đăng", () => {
  test("chính chủ xem được bài đăng của mình (200)", async () => {
    const res = await app.request(`/api/v1/users/${OWNER_HANDLE}/posts`, {
      headers: { Cookie: owner.cookie },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: unknown[]; next: string | null }
    expect(Array.isArray(body.items)).toBe(true)
  })

  test("người khác nhận 403", async () => {
    const res = await app.request(`/api/v1/users/${OWNER_HANDLE}/posts`, {
      headers: { Cookie: stranger.cookie },
    })
    expect(res.status).toBe(403)
  })

  test("khách chưa đăng nhập nhận 403", async () => {
    const res = await app.request(`/api/v1/users/${OWNER_HANDLE}/posts?tab=saved`)
    expect(res.status).toBe(403)
  })
})

describe("hồ sơ cơ bản vẫn công khai", () => {
  test("khách xem được hồ sơ cơ bản của người riêng tư", async () => {
    const res = await app.request(`/api/v1/users/${OWNER_HANDLE}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(userProfileSchema.safeParse(body).success).toBe(true)
    expect(body).toMatchObject({ handle: OWNER_HANDLE, privateProfile: true })
  })

  test("người riêng tư vẫn xuất hiện trong danh sách người dùng", async () => {
    const res = await app.request(`/api/v1/users?q=${OWNER_HANDLE}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(userPageSchema.safeParse(body).success).toBe(true)
    expect((body as { items: { handle: string }[] }).items.map((item) => item.handle)).toContain(
      OWNER_HANDLE,
    )
  })
})

describe("hồ sơ công khai không bị ảnh hưởng", () => {
  test("người khác vẫn xem được bộ sưu tập", async () => {
    const res = await app.request(`/api/v1/users/${PUBLIC_HANDLE}/collections`, {
      headers: { Cookie: stranger.cookie },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: { name: string }[] }
    expect(body.items.map((item) => item.name)).toContain("Bộ sưu tập công khai")
  })

  test("khách vẫn xem được bài đăng", async () => {
    const res = await app.request(`/api/v1/users/${PUBLIC_HANDLE}/posts`)
    expect(res.status).toBe(200)
  })
})
