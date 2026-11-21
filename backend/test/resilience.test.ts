import { rmSync } from "node:fs"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { registerVerifiedUser } from "./helpers/auth"
import { startTestDb, stopTestDb } from "./helpers/pg"

let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma

const suffix = Math.random().toString(36).slice(2, 8)
const UPLOAD_TEST_KEYS: string[] = []

beforeAll(async () => {
  const url = await startTestDb()
  process.env.DATABASE_URL = url
  process.env.LOG_LEVEL = "error"
  process.env.NODE_ENV = "test"
  process.env.MEDIA_LOCAL_FALLBACK = "true"
  process.env.BETTER_AUTH_URL = "http://localhost:8000"
  delete process.env.R2_ACCOUNT_ID
  delete process.env.R2_ACCESS_KEY_ID
  delete process.env.R2_SECRET_ACCESS_KEY
  delete process.env.R2_BUCKET
  delete process.env.R2_PUBLIC_BASE_URL

  const { createApp } = await import("../src/app")
  prisma = (await import("../src/lib/prisma")).prisma
  app = createApp()
}, 180_000)

afterAll(async () => {
  for (const key of UPLOAD_TEST_KEYS) {
    rmSync(join(import.meta.dir, "../data/uploads", key), { force: true })
  }
  await prisma?.$disconnect()
  await stopTestDb()
}, 60_000)

describe("resolveSeedMode & non-destructive SEED_MODE=prod", () => {
  test("ưu tiên SEED_MODE tường minh, fallback theo NODE_ENV", async () => {
    const { resolveSeedMode } = await import("../scripts/seed")
    expect(resolveSeedMode({ SEED_MODE: "prod", NODE_ENV: "development" })).toBe("prod")
    expect(resolveSeedMode({ SEED_MODE: "dev", NODE_ENV: "production" })).toBe("dev")
    expect(resolveSeedMode({ SEED_MODE: "test" })).toBe("test")
    expect(resolveSeedMode({ NODE_ENV: "production" })).toBe("prod")
    expect(resolveSeedMode({ NODE_ENV: "test" })).toBe("test")
    expect(resolveSeedMode({})).toBe("dev")
  })

  test("SEED_MODE=prod không xoá place tự tạo và không ghi đè chỉnh sửa của Admin", async () => {
    const existing = await prisma.place.findFirstOrThrow({
      where: { deletedAt: null },
      select: { id: true },
    })

    await prisma.place.update({
      where: { id: existing.id },
      data: { name: "Tên Đã Sửa Trên Prod", priceLevel: 3 },
    })

    const customId = `prod-custom-${suffix}`
    await prisma.place.create({
      data: {
        id: customId,
        name: "Quán Admin Tạo Riêng Trên Prod",
        address: "123 Bạch Đằng",
        district: "Hải Châu",
        category: "cafe",
        priceLevel: 2,
        publishedAt: new Date(),
      },
    })

    const backendDir = join(import.meta.dir, "..")
    const prodSeed = Bun.spawnSync(["bun", "run", "scripts/seed.ts"], {
      cwd: backendDir,
      env: {
        ...process.env,
        SEED_MODE: "prod",
        NODE_ENV: "production",
        BETTER_AUTH_SECRET: "test-production-secret-at-least-32-characters-long",
      },
      stdout: "pipe",
      stderr: "pipe",
    })
    if (prodSeed.exitCode !== 0) {
      throw new Error(`SEED_MODE=prod thất bại:\n${prodSeed.stderr.toString()}`)
    }

    const preservedExisting = await prisma.place.findUnique({
      where: { id: existing.id },
      select: { name: true, priceLevel: true },
    })
    expect(preservedExisting?.name).toBe("Tên Đã Sửa Trên Prod")
    expect(preservedExisting?.priceLevel).toBe(3)

    const preservedCustom = await prisma.place.findUnique({
      where: { id: customId },
      select: { id: true, name: true },
    })
    expect(preservedCustom?.id).toBe(customId)
  })
})

describe("Media Local Fallback & OSM Tile Proxy Resilience", () => {
  test("POST /media -> PUT /media/upload -> GET /media/files -> POST /posts hoạt động khi R2 tắt", async () => {
    const user = await registerVerifiedUser(app, prisma, {
      name: "Người Dự Phòng",
      email: `fallback_${suffix}@rendez.test`,
      handle: `fallback_${suffix}`,
    })

    const ticketRes = await app.request("/api/v1/media", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: user.cookie,
      },
      body: JSON.stringify({ folder: "posts", contentType: "image/png" }),
    })
    expect(ticketRes.status).toBe(201)

    const ticket = (await ticketRes.json()) as {
      uploadUrl: string
      publicUrl: string
      fallbackUploadUrl: string
      fallbackPublicUrl: string
      key: string
    }
    UPLOAD_TEST_KEYS.push(ticket.key)

    expect(ticket.uploadUrl).toContain("/api/v1/media/upload/")
    expect(ticket.publicUrl).toContain("/api/v1/media/files/")

    const uploadPath = new URL(ticket.uploadUrl).pathname + new URL(ticket.uploadUrl).search
    const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])
    const putRes = await app.request(uploadPath, {
      method: "PUT",
      headers: { "Content-Type": "image/png" },
      body: pngBytes,
    })
    expect(putRes.status).toBe(200)

    const filePath = new URL(ticket.publicUrl).pathname
    const getRes = await app.request(filePath)
    expect(getRes.status).toBe(200)
    expect(getRes.headers.get("content-type")).toBe("image/png")
    expect(getRes.headers.get("cross-origin-resource-policy")).toBe("cross-origin")

    const postRes = await app.request("/api/v1/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: user.cookie,
      },
      body: JSON.stringify({
        caption: "Bài viết dùng local storage dự phòng khi R2 tắt",
        images: [ticket.publicUrl],
      }),
    })
    expect(postRes.status).toBe(201)
    const createdPost = (await postRes.json()) as { images: string[] }
    expect(createdPost.images).toEqual([ticket.publicUrl])
  })

  test("GET /tiles/:z/:x/:file trả 400 nếu ngoài dải zoom và trả 200 image/png offline tile khi upstream sập", async () => {
    const badRes = await app.request("/api/v1/tiles/3/0/0.png")
    expect(badRes.status).toBe(400)

    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      throw new Error("Simulated network outage")
    }) as unknown as typeof fetch

    try {
      const tileRes = await app.request("/api/v1/tiles/19/419712/231840.png")
      expect(tileRes.status).toBe(200)
      expect(tileRes.headers.get("content-type")).toBe("image/png")
      expect(tileRes.headers.get("cross-origin-resource-policy")).toBe("cross-origin")
      const bytes = new Uint8Array(await tileRes.arrayBuffer())
      expect(Array.from(bytes.slice(0, 4))).toEqual([137, 80, 78, 71])
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
