import { describe, expect, it, vi } from "vitest"
import { uploadMediaFile, type MediaUploadTicket } from "./media-upload"

describe("uploadMediaFile resilience & fallback", () => {
  it("trả publicUrl khi primary upload (R2) thành công", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const file = new File(["img-bytes"], "photo.jpg", { type: "image/jpeg" })
    const ticket: MediaUploadTicket = {
      uploadUrl: "https://acct.r2.cloudflarestorage.com/bucket/posts/u1/a.jpg",
      publicUrl: "https://cdn.rendez.test/posts/u1/a.jpg",
      fallbackUploadUrl: "http://localhost:8000/api/v1/media/upload/posts/u1/a.jpg?sig=ok",
      fallbackPublicUrl: "http://localhost:8000/api/v1/media/files/posts/u1/a.jpg",
      key: "posts/u1/a.jpg",
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      headers: { "Content-Type": "image/jpeg" },
    }

    const url = await uploadMediaFile(file, ticket)
    expect(url).toBe(ticket.publicUrl)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(ticket.uploadUrl)

    vi.unstubAllGlobals()
  })

  it("tự động chuyển sang fallbackUploadUrl (Local Storage) khi R2 gặp lỗi", async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes("r2.cloudflarestorage.com")) {
        return Promise.resolve(new Response("R2 Unavailable", { status: 503 }))
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    })
    vi.stubGlobal("fetch", fetchMock)

    const file = new File(["img-bytes"], "photo.png", { type: "image/png" })
    const ticket: MediaUploadTicket = {
      uploadUrl: "https://acct.r2.cloudflarestorage.com/bucket/posts/u1/b.png",
      publicUrl: "https://cdn.rendez.test/posts/u1/b.png",
      fallbackUploadUrl: "http://localhost:8000/api/v1/media/upload/posts/u1/b.png?sig=ok",
      fallbackPublicUrl: "http://localhost:8000/api/v1/media/files/posts/u1/b.png",
      key: "posts/u1/b.png",
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      headers: { "Content-Type": "image/png" },
    }

    const url = await uploadMediaFile(file, ticket)
    expect(url).toBe(ticket.fallbackPublicUrl)
    // Primary retry (2 attempts) + 1 fallback PUT = 3 calls
    expect(
      fetchMock.mock.calls.some(
        ([u]) => typeof u === "string" && u.includes("/api/v1/media/upload/"),
      ),
    ).toBe(true)

    vi.unstubAllGlobals()
  })
})
