import { describe, expect, it } from "vitest"
import {
  formatCoordinate,
  formatCount,
  formatDate,
  formatDistance,
  formatInitials,
  formatNumber,
  formatRating,
  formatRelativeTime,
} from "./format"

describe("formatCount", () => {
  it("giữ nguyên số dưới 1000", () => {
    expect(formatCount(999)).toBe("999")
  })

  it("rút gọn nghìn và triệu theo chuẩn tiếng Việt", () => {
    expect(formatCount(1000)).toMatch(/1[.,]?\s?N/)
    expect(formatCount(1_500_000)).toMatch(/1[.,]5?\s?Tr/)
  })
})

describe("formatNumber", () => {
  it("phân cách nghìn theo tiếng Việt", () => {
    expect(formatNumber(1234)).toMatch(/1[.,]234/)
  })
})

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-11-09T00:00:00Z")

  it("trả chuỗi rỗng cho ngày không hợp lệ thay vì ném lỗi", () => {
    expect(formatRelativeTime("không-phải-ngày", now)).toBe("")
  })

  it("hiện đơn vị giờ", () => {
    const iso = new Date(now - 3 * 3_600_000).toISOString()
    expect(formatRelativeTime(iso, now)).toContain("giờ")
  })
})

describe("formatDate", () => {
  it("trả chuỗi rỗng cho ngày không hợp lệ", () => {
    expect(formatDate("abc")).toBe("")
  })
})

describe("formatRating", () => {
  it("luôn có 1 chữ số thập phân", () => {
    expect(formatRating(4.5)).toMatch(/^4[.,]5$/)
    expect(formatRating(5)).toMatch(/^5[.,]0$/)
  })
})

describe("formatCoordinate", () => {
  it("4 chữ số thập phân, dấu chấm cố định", () => {
    expect(formatCoordinate(16.061234)).toBe("16.0612")
  })
})

describe("formatDistance", () => {
  it("dưới 1 km hiện mét", () => {
    expect(formatDistance(0.35)).toBe("350 m")
  })

  it("từ 1 km hiện km", () => {
    expect(formatDistance(1.23)).toMatch(/1[.,]2 km/)
  })
})

describe("formatInitials", () => {
  it("lấy chữ cái đầu của tối đa 2 từ", () => {
    expect(formatInitials("Nguyễn Yến")).toBe("NY")
    expect(formatInitials("  lan  ")).toBe("L")
  })
})
