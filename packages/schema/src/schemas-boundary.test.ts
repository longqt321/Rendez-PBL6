import { describe, expect, test } from "bun:test"
import fc from "fast-check"
import {
  castRoomVoteInputSchema,
  createAnchorInputSchema,
  updateAdminPlaceInputSchema,
  updateMeInputSchema,
  upsertReviewInputSchema,
  validatePostImageUrls,
  validateProfileImageUrl,
} from "./index"

describe("Zod schemas & validators — Boundary Value Analysis & Security", () => {
  test("updateAdminPlaceInputSchema: biên tọa độ và từ chối NaN/Infinity/vượt biên", () => {
    expect(updateAdminPlaceInputSchema.safeParse({ lat: 90, lng: 180 }).success).toBe(true)
    expect(updateAdminPlaceInputSchema.safeParse({ lat: -90, lng: -180 }).success).toBe(true)
    expect(updateAdminPlaceInputSchema.safeParse({ lat: 90.0001, lng: 108 }).success).toBe(false)
    expect(updateAdminPlaceInputSchema.safeParse({ lat: -90.0001, lng: 108 }).success).toBe(false)
    expect(updateAdminPlaceInputSchema.safeParse({ lat: 16, lng: 180.0001 }).success).toBe(false)
    expect(updateAdminPlaceInputSchema.safeParse({ lat: Number.NaN, lng: 108 }).success).toBe(false)
    expect(updateAdminPlaceInputSchema.safeParse({ lat: Infinity, lng: 108 }).success).toBe(false)
    expect(updateAdminPlaceInputSchema.safeParse({ priceLevel: 0 }).success).toBe(false)
    expect(updateAdminPlaceInputSchema.safeParse({ priceLevel: 5 }).success).toBe(false)
  })

  test("createAnchorInputSchema: kiểm tra biên tọa độ, nhãn rỗng, kind không hợp lệ", () => {
    expect(
      createAnchorInputSchema.safeParse({
        kind: "home",
        label: "Nhà riêng",
        lat: 16.0544,
        lng: 108.2022,
      }).success,
    ).toBe(true)

    expect(
      createAnchorInputSchema.safeParse({
        kind: "invalid_kind",
        label: "Nhà",
        lat: 16.05,
        lng: 108.2,
      }).success,
    ).toBe(false)

    expect(
      createAnchorInputSchema.safeParse({
        kind: "home",
        label: "   ",
        lat: 16.05,
        lng: 108.2,
      }).success,
    ).toBe(false)
  })

  test("castRoomVoteInputSchema: chặn danh sách phiếu rỗng hoặc rank âm/0", () => {
    expect(castRoomVoteInputSchema.safeParse({ rankings: [] }).success).toBe(false)
    expect(
      castRoomVoteInputSchema.safeParse({
        rankings: [{ candidateId: "00000000-0000-4000-8000-000000000001", rank: 0 }],
      }).success,
    ).toBe(false)
    expect(
      castRoomVoteInputSchema.safeParse({
        rankings: [{ candidateId: "00000000-0000-4000-8000-000000000001", rank: -1 }],
      }).success,
    ).toBe(false)
  })

  test("upsertReviewInputSchema: biên độ dài nội dung và số lượng món đề xuất", () => {
    expect(
      upsertReviewInputSchema.safeParse({
        tier: "must_try",
        content: "Rất ngon",
        recommendedDishes: ["Mì Quảng", "Cao lầu", "Bánh xèo"],
      }).success,
    ).toBe(true)

    expect(
      upsertReviewInputSchema.safeParse({
        tier: "unknown",
        content: "Test",
      }).success,
    ).toBe(false)

    expect(
      upsertReviewInputSchema.safeParse({
        tier: "good",
        recommendedDishes: ["A", "B", "C", "D"],
      }).success,
    ).toBe(false)
  })

  test("validatePostImageUrls & validateProfileImageUrl: chặn javascript:, data:, cross-user IDOR, path traversal, trùng lặp", () => {
    const publicBaseUrl = "https://cdn.rendez.vn"
    const userId = "user-a-123"
    const opts = { userId, publicBaseUrl }

    expect(validatePostImageUrls(["javascript:alert(1)"], opts).ok).toBe(false)
    expect(validatePostImageUrls(["data:image/svg+xml,<svg/>"], opts).ok).toBe(false)
    expect(validatePostImageUrls(["https://evil.example/posts/user-a-123/a.jpg"], opts).ok).toBe(false)
    // Cross-user IDOR: dùng ảnh của user khác
    expect(validatePostImageUrls(["https://cdn.rendez.vn/posts/user-b-999/a.jpg"], opts).ok).toBe(false)
    // Path traversal: URL chuẩn hoá sẽ resolve `..` ra ngoài prefix posts/user-a-123/
    expect(
      validatePostImageUrls(["https://cdn.rendez.vn/posts/user-a-123/../../places/a.jpg"], opts).ok,
    ).toBe(false)
    // Query / userinfo injection
    expect(
      validatePostImageUrls(["https://cdn.rendez.vn/posts/user-a-123/a.webp?x=1"], opts).ok,
    ).toBe(false)

    const validUrl = "https://cdn.rendez.vn/posts/user-a-123/photo-1.webp"
    expect(validatePostImageUrls([validUrl, validUrl], opts).ok).toBe(false)
    expect(validatePostImageUrls([validUrl], opts).ok).toBe(true)

    expect(
      validateProfileImageUrl("https://cdn.rendez.vn/avatars/user-a-123/u1.webp", {
        ...opts,
        folder: "avatars",
      }).ok,
    ).toBe(true)
    // Cross-folder injection: dùng đường dẫn posts cho avatar phải bị chặn
    expect(
      validateProfileImageUrl("https://cdn.rendez.vn/posts/user-a-123/u1.webp", {
        ...opts,
        folder: "avatars",
      }).ok,
    ).toBe(false)
  })

  test("updateMeInputSchema: fuzz tên và bio bằng fast-check không bao giờ throw", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 500 }),
        fc.string({ maxLength: 500 }),
        (name, bio) => {
          const result = updateMeInputSchema.safeParse({
            name,
            bio,
            location: "Đà Nẵng",
            privateProfile: false,
          })
          expect(typeof result.success).toBe("boolean")
        },
      ),
      { numRuns: 150 },
    )
  })
})
