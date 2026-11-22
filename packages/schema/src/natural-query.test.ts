import { describe, expect, test } from "bun:test"
import fc from "fast-check"
import {
  DANANG_DISTRICTS_CANONICAL,
  PLACE_CATEGORY_LABELS,
  normalizeQueryText,
  parseNaturalFilterQuery,
  removeChipFromQuery,
} from "./index"

const VALID_CATEGORIES = new Set(Object.keys(PLACE_CATEGORY_LABELS))
const VALID_DISTRICTS = new Set<string>(DANANG_DISTRICTS_CANONICAL)

describe("natural-query parser — BVA, Unicode & Property-Based Fuzzing", () => {
  test("chuỗi rỗng, khoảng trắng, dấu câu thuần trả kết quả rỗng an toàn", () => {
    for (const input of ["", "   ", "\t\n  ", "!!! ??? --- ,,,", "   ...   "]) {
      const parsed = parseNaturalFilterQuery(input)
      expect(parsed.categories).toEqual([])
      expect(parsed.excludeCategories).toEqual([])
      expect(parsed.districts).toEqual([])
      expect(parsed.excludeDistricts).toEqual([])
      expect(parsed.chips).toEqual([])
      expect(parsed.priceMax).toBeUndefined()
      expect(parsed.nearMe).toBe(false)
    }
  })

  test("xử lý nhất quán Unicode tiếng Việt dạng tổ hợp (NFD) và dựng sẵn (NFC)", () => {
    const nfc = "cà phê hải châu dưới 50k không ăn vặt gần tôi".normalize("NFC")
    const nfd = nfc.normalize("NFD")

    expect(normalizeQueryText(nfc)).toBe(normalizeQueryText(nfd))

    const parsedNfc = parseNaturalFilterQuery(nfc)
    const parsedNfd = parseNaturalFilterQuery(nfd)
    expect(parsedNfd.categories).toEqual(parsedNfc.categories)
    expect(parsedNfd.excludeCategories).toEqual(parsedNfc.excludeCategories)
    expect(parsedNfd.districts).toEqual(parsedNfc.districts)
    expect(parsedNfd.priceMax).toBe(parsedNfc.priceMax)
    expect(parsedNfd.nearMe).toBe(parsedNfc.nearMe)
  })

  test("phủ định chồng lấp & ưu tiên exclude không bị dính sang include", () => {
    const parsed = parseNaturalFilterQuery("không cà phê, tránh ăn vặt ở Sơn Trà nhưng né Hải Châu")
    expect(parsed.excludeCategories).toContain("cafe")
    expect(parsed.excludeCategories).toContain("street-food")
    expect(parsed.categories).not.toContain("cafe")
    expect(parsed.categories).not.toContain("street-food")
    expect(parsed.districts).toContain("Sơn Trà")
    expect(parsed.excludeDistricts).toContain("Hải Châu")
    expect(parsed.districts).not.toContain("Hải Châu")
  })

  test("bất biến phân tích với hàng trăm chuỗi fuzz từ fast-check (không throw, không ReDoS, mọi output hợp lệ)", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 300 }), (raw) => {
        const startedAt = performance.now()
        const parsed = parseNaturalFilterQuery(raw)
        const elapsedMs = performance.now() - startedAt

        // Chống ReDoS: phân tích 1 chuỗi <= 300 ký tự phải cực nhanh
        expect(elapsedMs).toBeLessThan(50)

        // Mọi category & district trả về phải thuộc danh mục hợp lệ
        for (const cat of [...parsed.categories, ...parsed.excludeCategories]) {
          expect(VALID_CATEGORIES.has(cat)).toBe(true)
        }
        for (const dist of [...parsed.districts, ...parsed.excludeDistricts]) {
          expect(VALID_DISTRICTS.has(dist)).toBe(true)
        }
        if (parsed.priceMax !== undefined) {
          expect([1, 2, 3]).toContain(parsed.priceMax)
        }
        // Không thể cùng 1 quận/danh mục nằm ở cả include và exclude
        for (const cat of parsed.excludeCategories) {
          expect(parsed.categories).not.toContain(cat)
        }
        for (const dist of parsed.excludeDistricts) {
          expect(parsed.districts).not.toContain(dist)
        }
      }),
      { numRuns: 250 },
    )
  })

  test("removeChipFromQuery gỡ đúng chip được chọn mà không phá hỏng các tiêu chí khác", () => {
    const query = "cà phê ở Hải Châu dưới 50k gần đây"
    const parsed = parseNaturalFilterQuery(query)
    const districtChip = parsed.chips.find((c) => c.field === "district")
    expect(districtChip).toBeDefined()

    const afterRemove = removeChipFromQuery(query, districtChip!)
    const reparsed = parseNaturalFilterQuery(afterRemove)
    expect(reparsed.districts).toEqual([])
    expect(reparsed.categories).toContain("cafe")
    expect(reparsed.priceMax).toBe(1)
    expect(reparsed.nearMe).toBe(true)
  })

  test("chuỗi cực dài (2.000 ký tự lặp từ khóa) không gây đứng máy (ReDoS guard)", () => {
    const hostile = "không tránh né ".repeat(120) + "cà phê hải châu dưới 50k"
    const startedAt = performance.now()
    const parsed = parseNaturalFilterQuery(hostile)
    expect(performance.now() - startedAt).toBeLessThan(100)
    expect(Array.isArray(parsed.chips)).toBe(true)
  })
})
