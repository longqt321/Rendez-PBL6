import { describe, expect, it } from "vitest"
import { checkApiContract, findContract } from "./api-contracts"
import { placeSchema } from "@/features/places/types/place.schema"
import { postSchema } from "@/features/social/types/post.schema"
import { pageSchema } from "@/types/api-schema"

describe("checkApiContract", () => {
  it("response hợp lệ → không lỗi", () => {
    const place = {
      id: "p1",
      name: "Cà phê A",
      address: "12 Bạch Đằng",
      city: "Đà Nẵng",
      category: "cafe",
      tags: ["view-đẹp"],
      positiveRatio: 90,
      reviewCount: 12,
      priceLevel: 2,
      imageSeed: "seed",
      imageHeight: 320,
      publishedAt: null,
    }
    expect(checkApiContract("GET", "/places/p1", place)).toBeNull()
    expect(
      checkApiContract("GET", "/places", {
        items: [place],
        next: null,
      }),
    ).toBeNull()
    expect(
      checkApiContract("GET", "/places/map", {
        items: [place],
        total: 1,
      }),
    ).toBeNull()
    expect(
      checkApiContract("GET", "/places/saved", {
        items: [place],
        next: null,
      }),
    ).toBeNull()
    expect(
      checkApiContract("GET", "/places/recommended", {
        items: [place],
        next: null,
      }),
    ).toBeNull()
    expect(
      checkApiContract("GET", "/places/daily-picks", {
        date: "2026-11-19",
        items: [{ place, reason: "Gợi ý" }],
      }),
    ).toBeNull()
  })

  it("các path cố định dưới /places không bị /places/:id nuốt", () => {
    expect(findContract("GET", "/places/map")?.pattern.source).toBe(String.raw`^\/places\/map$`)
    expect(findContract("GET", "/places/saved")?.pattern.source).toBe(String.raw`^\/places\/saved$`)
    expect(findContract("GET", "/places/daily-picks")?.pattern.source).toBe(
      String.raw`^\/places\/daily-picks$`,
    )
    expect(findContract("GET", "/places/recommended")?.pattern.source).toBe(
      String.raw`^\/places\/recommended$`,
    )
  })

  it("response thiếu field → safeParse fail với thông điệp zod", () => {
    const message = checkApiContract("GET", "/posts", {
      items: [{ id: "post-1" }],
      next: null,
    })
    expect(message).not.toBeNull()
    expect(message).toMatch(/required|Invalid input/i)
  })

  it("field sai kiểu → fail", () => {
    const message = checkApiContract("GET", "/places/p1", {
      id: "p1",
      name: "Cà phê A",
      address: "12 Bạch Đằng",
      city: "Đà Nẵng",
      category: "cafe",
      tags: [],
      rating: "không phải số",
      reviewCount: 12,
      priceLevel: 2,
      imageSeed: "seed",
      imageHeight: 320,
      publishedAt: null,
    })
    expect(message).not.toBeNull()
  })

  it("path không có hợp đồng → bỏ qua", () => {
    expect(checkApiContract("GET", "/khong-ton-tai", { batKy: true })).toBeNull()
  })

  it("phân biệt method trên cùng path", () => {
    expect(findContract("GET", "/places")?.schema).toBeDefined()
    expect(findContract("PATCH", "/notifications")).toBeDefined()
    // PATCH /notifications trả mảng, không phải Page.
    const contract = findContract("PATCH", "/notifications")
    const systemNotification = {
      kind: "system",
      id: "n1",
      createdAt: "",
      read: false,
      title: "t",
      body: "b",
    }
    expect(contract?.schema.safeParse([systemNotification]).success).toBe(true)
    expect(contract?.schema.safeParse({ items: [], next: null }).success).toBe(false)
  })

  it("hợp đồng phòng lọc nhóm: Room, join, apply", () => {
    const room = {
      id: "r1",
      code: "AB23CD",
      name: "Nhóm",
      phase: "filtering",
      votingMode: "swipe_match",
      candidates: [],
      voteSummaries: [],
      votingProgress: { votedMemberIds: [], totalActiveMembers: 1, matchedCandidateIds: [] },
      members: [{ id: "m1", displayName: "Bạn", isMe: true, joinedAt: "" }],
      proposals: [
        {
          id: "p1",
          memberId: "m1",
          kind: "include",
          field: "category",
          value: "cafe",
          status: "open",
          createdAt: "",
        },
      ],
      filter: {
        categories: ["cafe"],
        excludedCategories: [],
        districts: [],
        excludedDistricts: [],
        includeKeywords: [],
        excludeKeywords: [],
      },
      createdAt: "",
    }

    expect(checkApiContract("GET", "/rooms/AB23CD", room)).toBeNull()
    // Tạo phòng trả thêm `guestToken` (cookie HttpOnly; trường này cho test/CLI).
    expect(checkApiContract("POST", "/rooms", { ...room, guestToken: "tok" })).toBeNull()
    expect(
      checkApiContract("POST", "/rooms/AB23CD/join", {
        room,
        memberId: "m1",
        joined: true,
      }),
    ).toBeNull()
    expect(
      checkApiContract("POST", "/rooms/AB23CD/proposals/p1/apply", {
        room,
        summary: "＋ Loại hình: Cà phê",
      }),
    ).toBeNull()

    // Thiếu `filter` → lệch hợp đồng.
    const broken: Record<string, unknown> = { ...room }
    delete broken.filter
    expect(checkApiContract("GET", "/rooms/AB23CD", broken)).not.toBeNull()
  })
})

describe("schema khớp type domain", () => {
  it("pageSchema(postSchema) khớp Page<Post>", () => {
    const page = pageSchema(postSchema)
    expect(page.safeParse({ items: [], next: "cursor-1" }).success).toBe(true)
    expect(page.safeParse({ items: [], next: 1 }).success).toBe(false)
  })

  it("placeSchema từ chối priceLevel ngoài 1|2|3", () => {
    const result = placeSchema.safeParse({
      id: "p1",
      name: "x",
      address: "x",
      city: "x",
      category: "cafe",
      tags: [],
      rating: 1,
      reviewCount: 0,
      priceLevel: 4,
      imageSeed: "x",
      imageHeight: 100,
      publishedAt: null,
    })
    expect(result.success).toBe(false)
  })
})
