import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { collectionSummarySchema, pageSchema, postSchema, userProfileSchema } from "@rendez/schema"
import { startTestDb, stopTestDb } from "./helpers/pg"

/**
 * Integration test Phase 5 — trang cá nhân + theo dõi (T5.3, T5.4).
 *
 * Kiểm `GET /users/:handle` (404, schema), tab bài (`saved`/`pinned` của người
 * khác RỖNG), bộ sưu tập ẩn private, follow idempotent + cấm tự follow + đếm
 * follower/following thật + thông báo `follow`.
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma

const profilePostPageSchema = pageSchema(postSchema)
const collectionPageSchema = pageSchema(collectionSummarySchema)

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
  handle: string
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
  return { cookie, id: body.id, handle }
}

function call(path: string, init: RequestInit & { cookie?: string } = {}) {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("Content-Type", "application/json")
  if (init.cookie) headers.set("Cookie", init.cookie)
  return app.request(path, { ...init, headers })
}

describe("trang cá nhân", () => {
  let alice: Session
  let bob: Session
  let postId = ""

  beforeAll(async () => {
    alice = await register("Alice Nguyễn", `alice_${suffix}`)
    bob = await register("Bob Trần", `bob_${suffix}`)

    const created = await call("/api/v1/posts", {
      method: "POST",
      cookie: alice.cookie,
      body: JSON.stringify({ caption: `Bài của Alice ${suffix}` }),
    })
    expect(created.status).toBe(201)
    postId = ((await created.json()) as { id: string }).id
  })

  test("GET /users/:handle 404 khi không tồn tại", async () => {
    const res = await call("/api/v1/users/khong_ton_tai_9999")
    expect(res.status).toBe(404)
  })

  test("GET /users/:handle trả UserProfile khớp schema", async () => {
    const res = await call(`/api/v1/users/${alice.handle}`, { cookie: bob.cookie })
    expect(res.status).toBe(200)
    const body = (await res.json()) as unknown
    expect(userProfileSchema.safeParse(body).success).toBe(true)
    const profile = body as { id: string; isMe: boolean; postCount: number }
    expect(profile.id).toBe(alice.id)
    expect(profile.isMe).toBe(false)
    expect(profile.postCount).toBeGreaterThanOrEqual(1)

    const mine = await call(`/api/v1/users/${alice.handle}`, { cookie: alice.cookie })
    expect(((await mine.json()) as { isMe: boolean }).isMe).toBe(true)
  })

  test("GET /users/:handle/posts trả bài của tác giả, khớp schema", async () => {
    const res = await call(`/api/v1/users/${alice.handle}/posts`, { cookie: bob.cookie })
    expect(res.status).toBe(200)
    const body = (await res.json()) as unknown
    expect(profilePostPageSchema.safeParse(body).success).toBe(true)
    const page = body as { items: Array<{ id: string; author: { id: string } }> }
    expect(page.items.some((post) => post.id === postId)).toBe(true)
    expect(page.items.every((post) => post.author.id === alice.id)).toBe(true)
  })

  test("tab saved/pinned của người khác RỖNG, của chính mình trả bài đã lưu", async () => {
    const stranger = await call(`/api/v1/users/${alice.handle}/posts?tab=saved`, {
      cookie: bob.cookie,
    })
    expect(((await stranger.json()) as { items: unknown[] }).items).toHaveLength(0)

    // Alice lưu bài của chính mình rồi xem tab saved (FE luôn gửi `saved` tường minh).
    await call(`/api/v1/posts/${postId}/save`, {
      method: "PATCH",
      cookie: alice.cookie,
      body: JSON.stringify({ saved: true }),
    })
    const own = await call(`/api/v1/users/${alice.handle}/posts?tab=saved`, {
      cookie: alice.cookie,
    })
    const page = (await own.json()) as { items: Array<{ id: string }> }
    expect(page.items.some((post) => post.id === postId)).toBe(true)
  })

  test("GET /users/:handle/collections ẩn private với người khác", async () => {
    const pub = await call("/api/v1/collections", {
      method: "POST",
      cookie: alice.cookie,
      body: JSON.stringify({ name: "Công khai" }),
    })
    expect(pub.status).toBe(201)
    const priv = await call("/api/v1/collections", {
      method: "POST",
      cookie: alice.cookie,
      body: JSON.stringify({ name: "Riêng tư", isPrivate: true }),
    })
    expect(priv.status).toBe(201)

    const asBob = await call(`/api/v1/users/${alice.handle}/collections`, { cookie: bob.cookie })
    const bobPage = (await asBob.json()) as unknown
    expect(collectionPageSchema.safeParse(bobPage).success).toBe(true)
    const bobItems = (bobPage as { items: Array<{ name: string }> }).items
    expect(bobItems.some((item) => item.name === "Công khai")).toBe(true)
    expect(bobItems.some((item) => item.name === "Riêng tư")).toBe(false)

    const asAlice = await call(`/api/v1/users/${alice.handle}/collections`, {
      cookie: alice.cookie,
    })
    const aliceItems = ((await asAlice.json()) as { items: Array<{ name: string }> }).items
    expect(aliceItems.some((item) => item.name === "Riêng tư")).toBe(true)
  })

  test("follow: cấm tự follow (400), idempotent, đếm thật, có thông báo", async () => {
    const self = await call(`/api/v1/users/${alice.handle}/follow`, {
      method: "POST",
      cookie: alice.cookie,
    })
    expect(self.status).toBe(400)

    const unauth = await call(`/api/v1/users/${alice.handle}/follow`, { method: "POST" })
    expect(unauth.status).toBe(401)

    const follow = await call(`/api/v1/users/${alice.handle}/follow`, {
      method: "POST",
      cookie: bob.cookie,
    })
    expect(follow.status).toBe(200)
    const followed = (await follow.json()) as unknown
    expect(userProfileSchema.safeParse(followed).success).toBe(true)
    expect((followed as { followerCount: number }).followerCount).toBe(1)
    expect((followed as { followedByMe: boolean }).followedByMe).toBe(true)

    // Lặp lại → vẫn 1, không nhân đôi.
    const again = await call(`/api/v1/users/${alice.handle}/follow`, {
      method: "POST",
      cookie: bob.cookie,
    })
    expect(((await again.json()) as { followerCount: number }).followerCount).toBe(1)

    const bobProfile = await call(`/api/v1/users/${bob.handle}`, { cookie: bob.cookie })
    expect(((await bobProfile.json()) as { followingCount: number }).followingCount).toBe(1)

    // Thông báo follow cho Alice — hợp đồng chỉ có actorName (không có actorId).
    const notifications = await call("/api/v1/notifications", { cookie: alice.cookie })
    const page = (await notifications.json()) as {
      items: Array<{ kind: string; actorName?: string }>
    }
    expect(page.items.some((item) => item.kind === "follow" && item.actorName === "Bob Trần")).toBe(
      true,
    )
    // Follow lặp lại (idempotent) KHÔNG sinh thông báo thứ hai.
    const followNotifications = page.items.filter((item) => item.kind === "follow")
    expect(followNotifications).toHaveLength(1)

    const unfollow = await call(`/api/v1/users/${alice.handle}/follow`, {
      method: "DELETE",
      cookie: bob.cookie,
    })
    expect(unfollow.status).toBe(200)
    const unfollowed = (await unfollow.json()) as { followerCount: number; followedByMe: boolean }
    expect(unfollowed.followerCount).toBe(0)
    expect(unfollowed.followedByMe).toBe(false)

    // Bỏ follow lần nữa → no-op, vẫn 0.
    const noop = await call(`/api/v1/users/${alice.handle}/follow`, {
      method: "DELETE",
      cookie: bob.cookie,
    })
    expect(((await noop.json()) as { followerCount: number }).followerCount).toBe(0)
  })

  test("follow người không tồn tại → 404", async () => {
    const res = await call("/api/v1/users/khong_ton_tai_9999/follow", {
      method: "POST",
      cookie: bob.cookie,
    })
    expect(res.status).toBe(404)
  })
})
