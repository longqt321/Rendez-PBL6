import { beforeAll, describe, expect, test } from "bun:test"
import type { PickCandidate } from "../src/lib/daily-picks"

/**
 * Unit test thuật toán "Gợi ý hôm nay" — thuần hàm, không DB.
 *
 * Input là mảng ứng viên + lịch sử picks; assert 6 tính chất của thiết kế
 * (`docs/thiet-ke/goi-y-hom-nay.md` mục 5): deterministic, khác ngày khác kết
 * quả, không lặp 7 ngày, co khi thiếu ứng viên, đa dạng category, ưu tiên quán mới.
 */

let mod: typeof import("../src/lib/daily-picks")

beforeAll(async () => {
  // `lib/daily-picks` kéo theo `lib/prisma` — env phải có trước khi nạp module.
  process.env.DATABASE_URL ??= "postgresql://placeholder:placeholder@localhost:5432/placeholder"
  process.env.NODE_ENV = "test"
  mod = await import("../src/lib/daily-picks")
}, 30_000)

/** Corpus giả lập: `count` quán chia đều `categories` category, 0 review. */
function makeCandidates(count: number, categories: string[]): PickCandidate[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `place-${index}`,
    category: categories[index % categories.length]!,
    district: `Quận ${String.fromCharCode(65 + (index % 5))}`,
    reviewCount: 0,
    imageCount: 0,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  }))
}

/** Ngày liên tiếp từ mốc — dùng cho giả lập 50 ngày. */
function dayOffset(base: string, days: number): string {
  return new Date(Date.parse(`${base}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

describe("selectDailyPicks", () => {
  test("1. cùng (candidates, history, date) → kết quả giống hệt (deterministic)", () => {
    const candidates = makeCandidates(30, ["restaurant", "cafe", "bar"])
    const a = mod.selectDailyPicks(candidates, [], "2026-11-12")
    const b = mod.selectDailyPicks([...candidates].reverse(), [], "2026-11-12")
    expect(b).toEqual(a)
    expect(a).toHaveLength(3)
  })

  test("2. 50 ngày giả lập — không có 2 ngày liên tiếp chọn cùng bộ 3", () => {
    const candidates = makeCandidates(40, ["restaurant", "cafe", "street-food", "bakery", "bar"])
    let previous: string[] | null = null
    for (let day = 0; day < 50; day += 1) {
      const date = dayOffset("2026-01-01", day)
      const ids = mod
        .selectDailyPicks(candidates, [], date)
        .map((pick) => pick.placeId)
        .sort()
      if (previous) expect(ids).not.toEqual(previous)
      previous = ids
    }
  })

  test("3. lịch sử 7 ngày chứa quán X → X không được chọn khi còn ứng viên", () => {
    const candidates = makeCandidates(30, ["restaurant", "cafe", "bar"])
    // 7 ngày gần nhất tính tới 2026-11-12 là 2026-11-06..11-11.
    const history = candidates.slice(0, 10).map((candidate, index) => ({
      placeId: candidate.id,
      pickDate: `2026-11-${6 + (index % 6)}`,
    }))
    const picked = mod.selectDailyPicks(candidates, history, "2026-11-12")
    for (const pick of picked) {
      expect(history.some((entry) => entry.placeId === pick.placeId)).toBe(false)
    }
  })

  test("4. chỉ có 2 quán đủ điều → trả 2, không crash", () => {
    const candidates = makeCandidates(2, ["cafe"])
    const picked = mod.selectDailyPicks(candidates, [], "2026-11-12")
    expect(picked).toHaveLength(2)
    expect(picked.map((pick) => pick.position)).toEqual([1, 2])
  })

  test("5. 3 slot thuộc ≥ 2 category khi corpus có ≥ 2 category", () => {
    const candidates = makeCandidates(30, ["restaurant", "cafe"])
    const picked = mod.selectDailyPicks(candidates, [], "2026-11-12")
    const categories = new Set(
      picked.map((pick) => candidates.find((candidate) => candidate.id === pick.placeId)?.category),
    )
    expect(categories.size).toBeGreaterThanOrEqual(2)
  })

  test("6. quán mới (< 30 ngày) được ưu tiên trên quán cũ cùng điểm", () => {
    const candidates = makeCandidates(30, ["cafe"])
    candidates[5]!.createdAt = new Date("2026-10-25T00:00:00Z") // mới so với 2026-11-12
    const picked = mod.selectDailyPicks(candidates, [], "2026-11-12")
    expect(picked[0]?.placeId).toBe("place-5")
    expect(picked[0]?.reason).toBe("Quán mới")
  })

  test("getPickDate trả YYYY-MM-DD theo Asia/Ho_Chi_Minh", () => {
    // 2026-11-11T18:00Z = 01:00 ngày 12/11 giờ Việt Nam.
    expect(mod.getPickDate(new Date("2026-11-11T18:00:00Z"))).toBe("2026-11-12")
    expect(mod.getPickDate(new Date("2026-11-11T16:00:00Z"))).toBe("2026-11-11")
  })

  test("7. quán có ảnh thật được ưu tiên trên quán không ảnh cùng điểm", () => {
    // Dải gợi ý hiển thị ảnh ngay trên đầu /discover — chọn quán OSM không ảnh
    // thì cả dải toàn placeholder. Ảnh là tín hiệu chất lượng quan trọng nhất.
    const candidates = makeCandidates(30, ["cafe"])
    candidates[7]!.imageCount = 2
    const picked = mod.selectDailyPicks(candidates, [], "2026-11-12")
    expect(picked[0]?.placeId).toBe("place-7")
    expect(picked[0]?.reason).toBe("Được chọn lọc")
  })

  test("8. đủ quán có ảnh thì không chọn quán không ảnh (cổng chất lượng)", () => {
    // 10 quán có ảnh + 20 quán OSM không ảnh: 3 slot phải thuộc nhóm có ảnh,
    // kể cả khi round-robin category muốn lấy quán không ảnh cho category nào đó.
    const candidates = makeCandidates(30, ["cafe", "restaurant", "bar"])
    for (let index = 0; index < 10; index += 1) candidates[index]!.imageCount = 3
    const picked = mod.selectDailyPicks(candidates, [], "2026-11-12")
    for (const pick of picked) {
      expect(Number(pick.placeId.split("-")[1])).toBeLessThan(10)
    }
  })
})
