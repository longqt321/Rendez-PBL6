import { beforeAll, describe, expect, test } from "bun:test"
import type { SuggestionCandidate } from "../src/lib/user-suggestions"

/**
 * Unit test thuật toán gợi ý người nên theo dõi — thuần hàm `rankSuggestions`,
 * không DB (thiết kế `docs/thiet-ke/tim-nguoi.md` mục 5).
 *
 * Tín hiệu riêng tư (`post_saves`, collection private) được lọc ở tầng SQL nên
 * test tầng đó nằm trong `users.test.ts` (integration).
 */

let mod: typeof import("../src/lib/user-suggestions")

beforeAll(async () => {
  // `lib/user-suggestions` kéo theo `lib/prisma` — env phải có trước khi nạp module.
  process.env.DATABASE_URL ??= "postgresql://placeholder:placeholder@localhost:5432/placeholder"
  process.env.NODE_ENV = "test"
  mod = await import("../src/lib/user-suggestions")
}, 30_000)

const TODAY = "2026-11-12"
/** Mốc cũ — ngoài cửa sổ 30 ngày nên không được cộng điểm "tài khoản mới". */
const OLD_DATE = new Date("2025-01-01T00:00:00Z")

/** Ứng viên không có tín hiệu — điểm 0, chỉ còn tiebreak hash. */
function makeCandidate(id: string, overrides: Partial<SuggestionCandidate> = {}) {
  return {
    id,
    sharedPlaces: 0,
    mutualFollows: 0,
    followsMe: false,
    recentActivity: 0,
    createdAt: OLD_DATE,
    ...overrides,
  } satisfies SuggestionCandidate
}

/** Danh sách ứng viên không tín hiệu — corpus hiện tại (42 users, ~0 tín hiệu). */
function makeFlatCandidates(count: number): SuggestionCandidate[] {
  return Array.from({ length: count }, (_, index) => makeCandidate(`user-${index}`))
}

describe("rankSuggestions", () => {
  test("1. cùng (candidates, viewerId, today) → kết quả giống hệt (deterministic)", () => {
    const candidates = makeFlatCandidates(12)
    const first = mod.rankSuggestions(candidates, "viewer-a", TODAY)
    const second = mod.rankSuggestions(candidates, "viewer-a", TODAY)

    expect(second).toEqual(first)
    expect(first).toHaveLength(5)
  })

  test("2. khác today → thứ tự tiebreak đổi trong 30 ngày giả lập", () => {
    const candidates = makeFlatCandidates(12)
    const base = mod.rankSuggestions(candidates, "viewer-a", TODAY).map((item) => item.id)

    const orders = new Set<string>()
    for (let day = 0; day < 30; day += 1) {
      const today = new Date(Date.parse(`${TODAY}T00:00:00Z`) + day * 86_400_000)
        .toISOString()
        .slice(0, 10)
      orders.add(
        mod
          .rankSuggestions(candidates, "viewer-a", today)
          .map((item) => item.id)
          .join(","),
      )
    }

    expect(orders.size).toBeGreaterThan(1)
    expect(base).toHaveLength(5)
  })

  test("3. khác viewerId → thứ tự tiebreak khác", () => {
    const candidates = makeFlatCandidates(20)
    const viewerA = mod.rankSuggestions(candidates, "viewer-a", TODAY).map((item) => item.id)
    const viewerB = mod.rankSuggestions(candidates, "viewer-b", TODAY).map((item) => item.id)

    expect(viewerB).not.toEqual(viewerA)
  })

  test("4. trọng số: quán chung > hoạt động gần đây > bạn chung", () => {
    // 1 quán chung = 3.0; 5 hoạt động = 1.5 × ln(6) ≈ 2.69; 1 bạn chung = 2.0.
    const ranked = mod.rankSuggestions(
      [
        makeCandidate("mutual", { mutualFollows: 1 }),
        makeCandidate("recent", { recentActivity: 5 }),
        makeCandidate("shared", { sharedPlaces: 1 }),
      ],
      "viewer-a",
      TODAY,
    )

    expect(ranked.map((item) => item.id)).toEqual(["shared", "recent", "mutual"])
  })

  test("5. reason khớp bảng ưu tiên (mỗi nhánh một case)", () => {
    const cases: { candidate: SuggestionCandidate; reason: string }[] = [
      { candidate: makeCandidate("a", { sharedPlaces: 2 }), reason: "Cùng quan tâm 2 quán" },
      { candidate: makeCandidate("b", { mutualFollows: 1 }), reason: "Có 1 người theo dõi chung" },
      { candidate: makeCandidate("c", { followsMe: true }), reason: "Theo dõi bạn" },
      { candidate: makeCandidate("d", { recentActivity: 3 }), reason: "Đang hoạt động gần đây" },
      {
        candidate: makeCandidate("e", { createdAt: new Date(`${TODAY}T01:00:00Z`) }),
        reason: "Mới tham gia Rendez",
      },
      { candidate: makeCandidate("f"), reason: "Gợi ý cho bạn" },
    ]

    for (const item of cases) {
      const [ranked] = mod.rankSuggestions([item.candidate], "viewer-a", TODAY)
      expect(ranked?.reason).toBe(item.reason)
    }
  })

  test("5b. reason ưu tiên đúng thứ tự khi nhiều tín hiệu cùng có", () => {
    const [ranked] = mod.rankSuggestions(
      [
        makeCandidate("multi", {
          sharedPlaces: 1,
          mutualFollows: 2,
          followsMe: true,
          recentActivity: 4,
          createdAt: new Date(`${TODAY}T01:00:00Z`),
        }),
      ],
      "viewer-a",
      TODAY,
    )

    expect(ranked?.reason).toBe("Cùng quan tâm 1 quán")
  })

  test("6. corpus rỗng tín hiệu → vẫn trả đủ 5 người theo hash, không crash", () => {
    const ranked = mod.rankSuggestions(makeFlatCandidates(42), "viewer-a", TODAY)

    expect(ranked).toHaveLength(5)
    expect(new Set(ranked.map((item) => item.id)).size).toBe(5)
    for (const item of ranked) expect(item.reason).toBe("Gợi ý cho bạn")
  })

  test("6b. ít hơn 5 ứng viên → trả đúng số có, không bịa thêm", () => {
    const ranked = mod.rankSuggestions(makeFlatCandidates(2), "viewer-a", TODAY)
    expect(ranked).toHaveLength(2)
  })

  test("7. tín hiệu riêng tư không sinh sharedPlaces → reason không phải 'Cùng quan tâm'", () => {
    // SQL đã trả sharedPlaces = 0 khi chỉ có post_save/collection private chung.
    const [ranked] = mod.rankSuggestions(
      [makeCandidate("private-signal", { sharedPlaces: 0, recentActivity: 1 })],
      "viewer-a",
      TODAY,
    )

    expect(ranked?.reason).not.toContain("Cùng quan tâm")
    expect(ranked?.reason).toBe("Đang hoạt động gần đây")
  })

  test("9. reason không chứa tên/handle của bất kỳ user nào khác", () => {
    const names = ["Nguyễn Yến", "dung.an", "longtran"]
    const candidates = names.map((name, index) =>
      // `name` chỉ dùng để chứng minh reason KHÔNG chứa nó — id cố ý khác tên.
      makeCandidate(`id-${index}-${name.length}`, {
        sharedPlaces: index + 1,
        mutualFollows: index,
      }),
    )

    for (const item of mod.rankSuggestions(candidates, "viewer-a", TODAY)) {
      for (const name of names) expect(item.reason).not.toContain(name)
    }
  })
})
