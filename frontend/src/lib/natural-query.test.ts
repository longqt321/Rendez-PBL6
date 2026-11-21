import { describe, expect, it } from "vitest"
import { parseNaturalFilterQuery, removeChipFromQuery } from "@rendez/schema"

describe("parseNaturalFilterQuery", () => {
  it("bóc tách đúng câu gõ gộp loại hình, quận, mức giá và giữ residualQuery sạch", () => {
    const parsed = parseNaturalFilterQuery("cà phê sân vườn ở Sơn Trà dưới 50k")
    expect(parsed.categories).toEqual(["cafe"])
    expect(parsed.districts).toEqual(["Sơn Trà"])
    expect(parsed.priceMax).toBe(1)
    expect(parsed.residualQuery).toBe("sân vườn")
    expect(parsed.chips.map((c) => c.field)).toEqual(["category", "district", "priceMax"])
  })

  it("bóc tách câu thuần ý định -> residualQuery rỗng để kích hoạt SQL Fast-Path", () => {
    const parsed = parseNaturalFilterQuery("quán ăn Hải Châu tầm trung")
    expect(parsed.categories).toEqual(["restaurant"])
    expect(parsed.districts).toEqual(["Hải Châu"])
    expect(parsed.priceMax).toBe(2)
    expect(parsed.residualQuery).toBe("")
  })

  it("bắt phủ định tiếng Việt cho cả danh mục, quận và từ khoá tự do", () => {
    const parsed = parseNaturalFilterQuery("quán ăn Hải Châu không ăn hải sản, né Cẩm Lệ")
    expect(parsed.categories).toEqual(["restaurant"])
    expect(parsed.districts).toEqual(["Hải Châu"])
    expect(parsed.excludeDistricts).toEqual(["Cẩm Lệ"])
    expect(parsed.excludeKeywords).toEqual(["hải sản"])
    expect(parsed.residualQuery).toBe("")
  })

  it("an toàn trước từ đồng âm tiếng Việt ('bò né Hải Châu' và 'Chế Lan Viên')", () => {
    const boNe = parseNaturalFilterQuery("bò né Hải Châu")
    expect(boNe.districts).toEqual(["Hải Châu"])
    expect(boNe.excludeDistricts).toEqual([])
    expect(boNe.residualQuery).toBe("bò né")

    const cheLanVien = parseNaturalFilterQuery("cà phê Chế Lan Viên")
    expect(cheLanVien.categories).toEqual(["cafe"])
    expect(cheLanVien.residualQuery).toBe("Chế Lan Viên")
  })

  it("bóc cụm 'gần tôi' và '24/7' chính xác", () => {
    const parsed = parseNaturalFilterQuery("cà phê gần tôi mở khuya")
    expect(parsed.categories).toEqual(["cafe"])
    expect(parsed.nearMe).toBe(true)
    expect(parsed.alwaysOpen).toBe(true)
    expect(parsed.residualQuery).toBe("")
  })

  it("removeChipFromQuery xoá đúng cụm thuộc tính và giới từ đệm đi kèm", () => {
    const parsed = parseNaturalFilterQuery("cà phê ở Hải Châu dưới 50k")
    const districtChip = parsed.chips.find((c) => c.field === "district")!
    expect(removeChipFromQuery("cà phê ở Hải Châu dưới 50k", districtChip)).toBe("cà phê dưới 50k")
  })
})
