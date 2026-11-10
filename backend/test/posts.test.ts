import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { commentSchema, pageSchema, postSchema } from "@rendez/schema"
import { startTestDb, stopTestDb } from "./helpers/pg"

/**
 * Integration test Phase 3 — bài đăng + bình luận trên Postgres thật.
 *
 * Kiểm hợp đồng `postSchema`/`commentSchema`, like/save idempotent, side effect
 * A7.3 khi gắn địa điểm, bình luận phẳng lồng 1 cấp (A7.6), quyền xoá.
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma

const postPageSchema = pageSchema(postSchema)

/** Hậu tố ngẫu nhiên — các file test dùng chung một container. */
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

describe("bài đăng", () => {
  let author: Session
  let other: Session
  let postId = ""

  beforeAll(async () => {
    author = await register("Tác Giả", `tac_gia_${suffix}`)
    other = await register("Người Khác", `nguoi_khac_${suffix}`)
  })

  test("POST /posts cần đăng nhập", async () => {
    const res = await call("/api/v1/posts", {
      method: "POST",
      body: JSON.stringify({ caption: "Bài không đăng nhập" }),
    })
    expect(res.status).toBe(401)
  })

  test("POST /posts tạo bài, trả Post khớp schema", async () => {
    const res = await call("/api/v1/posts", {
      method: "POST",
      cookie: author.cookie,
      body: JSON.stringify({ caption: "Bánh xèo Đà Nẵng rất ngon" }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(postSchema.safeParse(body).success).toBe(true)
    const post = body as { id: string; placeId: string | null; place: unknown }
    expect(post.placeId).toBeNull()
    expect(post.place).toBeNull()
    postId = post.id
  })

  test("POST /posts caption quá ngắn trả 400", async () => {
    const res = await call("/api/v1/posts", {
      method: "POST",
      cookie: author.cookie,
      body: JSON.stringify({ caption: "ab" }),
    })
    expect(res.status).toBe(400)
  })

  test("GET /posts trả Page<Post> khớp schema", async () => {
    const res = await call("/api/v1/posts")
    expect(res.status).toBe(200)
    expect(postPageSchema.safeParse(await res.json()).success).toBe(true)
  })

  test("filter=unplaced chỉ trả bài chưa gắn địa điểm", async () => {
    const body = (await (await call("/api/v1/posts?filter=unplaced")).json()) as {
      items: { placeId: string | null }[]
    }
    for (const item of body.items) expect(item.placeId).toBeNull()
  })

  test("filter=mine cần đăng nhập và chỉ trả bài của mình", async () => {
    const anonymous = await call("/api/v1/posts?filter=mine")
    expect(anonymous.status).toBe(401)

    const body = (await (
      await call("/api/v1/posts?filter=mine", { cookie: author.cookie })
    ).json()) as { items: { author: { id: string } }[] }
    expect(body.items.length).toBeGreaterThan(0)
    for (const item of body.items) expect(item.author.id).toBe(author.id)
  })

  test("like idempotent: bật 2 lần chỉ tăng 1, tắt về 0", async () => {
    const like = () =>
      call(`/api/v1/posts/${postId}/like`, {
        method: "PATCH",
        cookie: other.cookie,
        body: JSON.stringify({ liked: true }),
      })

    const first = (await (await like()).json()) as { likeCount: number; likedByMe: boolean }
    expect(first).toMatchObject({ likeCount: 1, likedByMe: true })

    const second = (await (await like()).json()) as { likeCount: number }
    expect(second.likeCount).toBe(1)

    const unlike = (await (
      await call(`/api/v1/posts/${postId}/like`, {
        method: "PATCH",
        cookie: other.cookie,
        body: JSON.stringify({ liked: false }),
      })
    ).json()) as { likeCount: number; likedByMe: boolean }
    expect(unlike).toMatchObject({ likeCount: 0, likedByMe: false })
  })

  test("like sinh thông báo cho tác giả, không tự thông báo mình", async () => {
    await call(`/api/v1/posts/${postId}/like`, {
      method: "PATCH",
      cookie: other.cookie,
      body: JSON.stringify({ liked: true }),
    })

    const mine = (await (
      await call("/api/v1/notifications", { cookie: author.cookie })
    ).json()) as { items: { kind: string; actorName?: string }[] }
    expect(mine.items.some((item) => item.kind === "like")).toBe(true)

    // Tác giả tự like bài của mình — không sinh thông báo cho chính mình.
    await call(`/api/v1/posts/${postId}/like`, {
      method: "PATCH",
      cookie: author.cookie,
      body: JSON.stringify({ liked: true }),
    })

    const after = (await (
      await call("/api/v1/notifications", { cookie: author.cookie })
    ).json()) as { items: { kind: string; actorName?: string }[] }
    expect(after.items.some((item) => item.kind === "like" && item.actorName === "Tác Giả")).toBe(
      false,
    )
  })

  test("save idempotent + filter=saved", async () => {
    const save = (saved: boolean) =>
      call(`/api/v1/posts/${postId}/save`, {
        method: "PATCH",
        cookie: other.cookie,
        body: JSON.stringify({ saved }),
      })

    expect(((await (await save(true)).json()) as { savedByMe: boolean }).savedByMe).toBe(true)
    expect(((await (await save(true)).json()) as { savedByMe: boolean }).savedByMe).toBe(true)

    const saved = (await (
      await call("/api/v1/posts?filter=saved", { cookie: other.cookie })
    ).json()) as { items: { id: string }[] }
    expect(saved.items.map((item) => item.id)).toContain(postId)

    await save(false)
  })

  test("PATCH /posts/:id/place gắn địa điểm + publish place chưa publish", async () => {
    // Chọn động một place chưa publish để không phụ thuộc thứ tự file test.
    const unpublished = await prisma.place.findFirst({
      where: { publishedAt: null, deletedAt: null },
      select: { id: true },
    })
    if (!unpublished) throw new Error("Dataset seed không còn place chưa publish để test")
    const unpublishedId = unpublished.id

    const res = await call(`/api/v1/posts/${postId}/place`, {
      method: "PATCH",
      cookie: author.cookie,
      body: JSON.stringify({ placeId: unpublishedId }),
    })
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      placeId: string
      place: { id: string; isPublished: boolean }
    }
    expect(body.placeId).toBe(unpublishedId)
    expect(body.place.isPublished).toBe(true)

    // Place đã publish thì hiện trong danh sách công khai.
    const detail = await call(`/api/v1/places/${unpublishedId}`)
    expect(detail.status).toBe(200)
  })

  test("PATCH /posts/:id/place thiếu placeId trả 404", async () => {
    const res = await call(`/api/v1/posts/${postId}/place`, {
      method: "PATCH",
      cookie: author.cookie,
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(404)
  })
})

describe("bình luận", () => {
  let author: Session
  let other: Session
  let postId = ""
  let parentId = ""
  let replyId = ""

  beforeAll(async () => {
    author = await register("Chủ Bài", `chu_bai_${suffix}`)
    other = await register("Bình Luận", `binh_luan_${suffix}`)

    const res = await call("/api/v1/posts", {
      method: "POST",
      cookie: author.cookie,
      body: JSON.stringify({ caption: "Bài để bình luận thử nghiệm" }),
    })
    postId = ((await res.json()) as { id: string }).id
  })

  test("POST comment gốc trả Comment khớp schema", async () => {
    const res = await call(`/api/v1/posts/${postId}/comments`, {
      method: "POST",
      cookie: other.cookie,
      body: JSON.stringify({ body: "Quán này ngon thật" }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(commentSchema.safeParse(body).success).toBe(true)
    const comment = body as {
      id: string
      parentId: string | null
      replyTo: unknown
      isMine: boolean
    }
    expect(comment.parentId).toBeNull()
    expect(comment.replyTo).toBeNull()
    expect(comment.isMine).toBe(true)
    parentId = comment.id
  })

  test("reply 1 cấp có replyTo trỏ về cha", async () => {
    const res = await call(`/api/v1/posts/${postId}/comments`, {
      method: "POST",
      cookie: author.cookie,
      body: JSON.stringify({ body: "Cảm ơn bạn", parentId }),
    })

    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      id: string
      replyTo: { commentId: string; handle: string }
    }
    expect(body.replyTo).toEqual({ commentId: parentId, handle: `binh_luan_${suffix}` })
    replyId = body.id
  })

  test("reply của reply bị từ chối (chỉ 1 cấp)", async () => {
    const res = await call(`/api/v1/posts/${postId}/comments`, {
      method: "POST",
      cookie: other.cookie,
      body: JSON.stringify({ body: "Trả lời lồng 2 cấp", parentId: replyId }),
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ message: "Chỉ hỗ trợ trả lời 1 cấp" })
  })

  test("GET comments trả phẳng: cha rồi reply ngay sau", async () => {
    const res = await call(`/api/v1/posts/${postId}/comments`)
    const body = (await res.json()) as { items: { id: string; parentId: string | null }[] }

    expect(body.items.map((item) => item.id)).toEqual([parentId, replyId])
    expect(body.items[1]?.parentId).toBe(parentId)
  })

  test("commentCount của bài tăng theo số bình luận", async () => {
    const post = (await (await call(`/api/v1/posts/${postId}`)).json()) as { commentCount: number }
    expect(post.commentCount).toBe(2)
  })

  test("PATCH like comment idempotent", async () => {
    const like = () =>
      call(`/api/v1/comments/${parentId}/like`, {
        method: "PATCH",
        cookie: author.cookie,
        body: JSON.stringify({ liked: true }),
      })

    expect(((await (await like()).json()) as { likeCount: number }).likeCount).toBe(1)
    expect(((await (await like()).json()) as { likeCount: number }).likeCount).toBe(1)
  })

  test("xoá bình luận của người khác trả 403", async () => {
    const res = await call(`/api/v1/comments/${parentId}`, {
      method: "DELETE",
      cookie: author.cookie,
    })
    expect(res.status).toBe(403)
  })

  test("xoá bình luận của mình ẩn cả reply và giảm commentCount", async () => {
    const res = await call(`/api/v1/comments/${parentId}`, {
      method: "DELETE",
      cookie: other.cookie,
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ deleted: true })

    const list = (await (await call(`/api/v1/posts/${postId}/comments`)).json()) as {
      items: unknown[]
    }
    expect(list.items).toHaveLength(0)

    const post = (await (await call(`/api/v1/posts/${postId}`)).json()) as { commentCount: number }
    expect(post.commentCount).toBe(0)
  })
})
