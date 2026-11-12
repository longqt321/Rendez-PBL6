import { describe, expect, test } from "bun:test"
import { allSynonyms, normalizeSearchText, synonymVariants } from "../src/lib/search-synonyms"

/**
 * Test thuần cho map từ đồng nghĩa — không DB. Quy tắc chuẩn hoá phải trùng
 * `immutable_search_normalize()` của Postgres (migration 20261111090000), vì
 * map chỉ tra được khi khoá và truy vấn cùng một dạng chuẩn hoá.
 */
describe("normalizeSearchText", () => {
  test("bỏ dấu, đ→d, lowercase, dấu câu → khoảng trắng, gộp space", () => {
    expect(normalizeSearchText("Cà Phê Trung")).toBe("ca phe trung")
    expect(normalizeSearchText("Quán Ăn, Ngon!")).toBe("quan an ngon")
    expect(normalizeSearchText("HẢI SẢN ĐÀ NẴNG")).toBe("hai san da nang")
    expect(normalizeSearchText("  nhiều    khoảng trắng  ")).toBe("nhieu khoang trang")
  })
})

describe("synonymVariants", () => {
  test("trả biến thể cho các cụm trong hợp đồng", () => {
    expect(synonymVariants("quan ngon")).toEqual(["quan an", "nha hang", "quan nhau"])
    expect(synonymVariants("an dem")).toEqual(["quan nhau", "nuong", "lau"])
    expect(synonymVariants("ca phe")).toEqual(["cafe", "coffee"])
    expect(synonymVariants("an sang")).toEqual(["pho", "banh mi", "bun", "chao"])
    expect(synonymVariants("hai san")).toEqual(["hai san", "seafood"])
    expect(synonymVariants("chay")).toEqual(["chay", "vegetarian"])
  })

  test("trả rỗng cho cụm không có trong map (không đoán mò)", () => {
    expect(synonymVariants("banh xeo")).toEqual([])
    expect(synonymVariants("")).toEqual([])
  })

  test("khoá và mọi biến thể đều đã chuẩn hoá (không dấu, lowercase)", () => {
    for (const [key, variants] of Object.entries(allSynonyms())) {
      expect(normalizeSearchText(key)).toBe(key)
      for (const variant of variants) {
        expect(normalizeSearchText(variant)).toBe(variant)
      }
    }
  })
})
