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

  test("không đảo nghĩa 'không gian yên tĩnh' / 'không khí thoáng mát' thành phủ định", () => {
    const q1 = parseNaturalFilterQuery("quán cafe không gian yên tĩnh")
    expect(q1.categories).toContain("cafe")
    expect(q1.excludeKeywords).toEqual([])
    expect(q1.excludeCategories).toEqual([])

    const q2 = parseNaturalFilterQuery("cf không khí thoáng mát")
    expect(q2.categories).toContain("cafe")
    expect(q2.excludeKeywords).toEqual([])
  })

  test("không khớp nhầm từ đồng âm có dấu ('cơm cháy' ≠ Chay, 'mắm tôm' ≠ Hải sản)", () => {
    const comChay = parseNaturalFilterQuery("cơm cháy kho quẹt")
    expect(comChay.tags).not.toContain("Chay")

    const mamTom = parseNaturalFilterQuery("bún đậu mắm tôm")
    expect(mamTom.tags).not.toContain("Hải sản")

    const anChay = parseNaturalFilterQuery("quán chay yên tĩnh")
    expect(anChay.tags).toContain("Chay")
  })

  test("nhận diện 'cf', mức giá số ('dưới 65k', 'tầm 55k') và giữ dấu phẩy khi xoá chip", () => {
    const p1 = parseNaturalFilterQuery("cf dưới 65k")
    expect(p1.categories).toContain("cafe")
    expect(p1.priceMax).toBe(2)

    const p2 = parseNaturalFilterQuery("tầm 55k ở Sơn Trà")
    expect(p2.priceMax).toBe(1)
    expect(p2.districts).toContain("Sơn Trà")

    const raw = "cà phê ở Hải Châu, không ồn"
    const parsed = parseNaturalFilterQuery(raw)
    const districtChip = parsed.chips.find((c) => c.field === "district")
    expect(districtChip).toBeDefined()
    expect(removeChipFromQuery(raw, districtChip!)).toContain(",")
  })
})
