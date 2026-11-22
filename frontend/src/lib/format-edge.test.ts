import fc from "fast-check"
import { describe, expect, it } from "vitest"
import {
  formatCoordinate,
  formatCoordinateKey,
  formatCount,
  formatDate,
  formatDateTime,
  formatDistance,
  formatInitials,
  formatRelativeTime,
  formatWeekdayDate,
} from "./format"

describe("format.ts — Boundary Values & Property-Based Fuzzing", () => {
  it("biên formatCount & formatDistance quanh 999/1000 và 0.999/1", () => {
    expect(formatCount(0)).toBe("0")
    expect(formatCount(999)).toBe("999")
    expect(formatCount(1000)).not.toBe("1000")

    expect(formatDistance(0)).toBe("0 m")
    expect(formatDistance(0.35)).toBe("350 m")
    expect(formatDistance(1)).toBe("1 km")
    expect(formatDistance(1.25)).toBe("1,3 km")
  })

  it("chuỗi ngày không hợp lệ luôn trả chuỗi rỗng, không bao giờ throw RangeError", () => {
    for (const bad of ["", "not-a-date", "2026-99-99", "NaN", "0000-00-00"]) {
      expect(formatDate(bad)).toBe("")
      expect(formatDateTime(bad)).toBe("")
      expect(formatWeekdayDate(bad)).toBe("")
      expect(formatRelativeTime(bad)).toBe("")
    }
  })

  it("formatCoordinate & formatCoordinateKey ổn định theo đúng số chữ số thập phân", () => {
    expect(formatCoordinate(16.0544123)).toBe("16.0544")
    expect(formatCoordinateKey(16.054419, 108.202211)).toBe("16.05442,108.20221")
  })

  it("formatInitials xử lý an toàn khoảng trắng thừa, chuỗi rỗng và tên nhiều từ", () => {
    expect(formatInitials("")).toBe("")
    expect(formatInitials("   ")).toBe("")
    expect(formatInitials("  Nguyễn   Hoàng   Yến  ")).toBe("NH")
  })

  it("fuzz toàn bộ hàm định dạng ngày bằng fast-check không bao giờ throw", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 100 }), (raw) => {
        expect(typeof formatDate(raw)).toBe("string")
        expect(typeof formatDateTime(raw)).toBe("string")
        expect(typeof formatWeekdayDate(raw)).toBe("string")
        expect(typeof formatRelativeTime(raw)).toBe("string")
        expect(typeof formatInitials(raw)).toBe("string")
      }),
      { numRuns: 150 },
    )
  })
})
