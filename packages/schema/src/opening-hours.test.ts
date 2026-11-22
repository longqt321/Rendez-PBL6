import { describe, expect, test } from "bun:test"
import fc from "fast-check"
import { isOpenNow } from "./opening-hours"

/** Tạo mốc Date UTC tương ứng đúng giờ tường Việt Nam (UTC+7). */
function vnTime(isoLocal: string): Date {
  return new Date(`${isoLocal}+07:00`)
}

describe("opening-hours — BVA múi giờ VN, xuyên nửa đêm & Fuzzing", () => {
  test("mốc ranh giới chính xác giây trước/sau giờ mở và đóng cửa (07:00-22:00)", () => {
    const spec = "Mo-Su 07:00-22:00"
    expect(isOpenNow(spec, vnTime("2026-11-23T06:59:59"))).toBe(false)
    expect(isOpenNow(spec, vnTime("2026-11-23T07:00:00"))).toBe(true)
    expect(isOpenNow(spec, vnTime("2026-11-23T21:59:59"))).toBe(true)
    expect(isOpenNow(spec, vnTime("2026-11-23T22:00:00"))).toBe(false)
  })

  test("khung giờ xuyên nửa đêm (18:00-02:00) tại 23:59, 00:00, 01:59 và 02:00", () => {
    const spec = "Mo-Su 18:00-02:00"
    expect(isOpenNow(spec, vnTime("2026-11-23T17:59:59"))).toBe(false)
    expect(isOpenNow(spec, vnTime("2026-11-23T18:00:00"))).toBe(true)
    expect(isOpenNow(spec, vnTime("2026-11-23T23:59:59"))).toBe(true)
    expect(isOpenNow(spec, vnTime("2026-11-24T00:00:00"))).toBe(true)
    expect(isOpenNow(spec, vnTime("2026-11-24T01:59:59"))).toBe(true)
    expect(isOpenNow(spec, vnTime("2026-11-24T02:00:00"))).toBe(false)
  })

  test("chuỗi có giây (HH:MM:SS), 24/7 kèm khoảng trắng, ngày nghỉ off", () => {
    expect(isOpenNow("  24/7  ", vnTime("2026-11-23T03:30:00"))).toBe(true)
    expect(isOpenNow("Mo-Su 08:00:00-17:30:00", vnTime("2026-11-23T08:00:00"))).toBe(true)
    expect(isOpenNow("Mo-Su 08:00:00-17:30:00", vnTime("2026-11-23T17:30:00"))).toBe(false)
    // 2026-11-23 là thứ Hai (Mo); 2026-11-22 là Chủ nhật (Su)
    expect(isOpenNow("Mo-Sa 08:00-20:00; Su off", vnTime("2026-11-22T12:00:00"))).toBe(false)
    expect(isOpenNow("Mo-Sa 08:00-20:00; Su off", vnTime("2026-11-23T12:00:00"))).toBe(true)
  })

  test("chuỗi thiếu khung giờ, rỗng hoặc null luôn trả null (không suy diễn)", () => {
    for (const invalid of [null, "", "   ", "Mo-Fr", "08:00", "mở cả ngày", "99:99-99:99"]) {
      expect(isOpenNow(invalid, vnTime("2026-11-23T10:00:00"))).toBeNull()
    }
  })

  test("fuzz chuỗi opening_hours bất kỳ bằng fast-check không bao giờ throw", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 120 }), (raw) => {
        const result = isOpenNow(raw, vnTime("2026-11-23T12:00:00"))
        expect(result === true || result === false || result === null).toBe(true)
      }),
      { numRuns: 200 },
    )
  })
})
