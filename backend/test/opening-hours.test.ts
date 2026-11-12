import { describe, expect, test } from "bun:test"
import { isOpenNow } from "../src/lib/opening-hours"

/**
 * Test thuần cho parser `opening_hours` — cùng quy tắc với bản FE
 * (`frontend/src/features/places/lib/opening-hours.ts`) để server và client
 * không kết luận khác nhau cho cùng một quán. Mọi mốc thời gian đều cố định,
 * không phụ thuộc clock của test.
 */

/** Thứ 5, 2026-11-12, 10:00 giờ Việt Nam (UTC 03:00). */
const THU_10AM = new Date("2026-11-12T03:00:00Z")
/** Thứ 5, 2026-11-12, 23:30 giờ Việt Nam (UTC 16:30). */
const THU_1130PM = new Date("2026-11-12T16:30:00Z")
/** Thứ 6, 2026-11-13, 00:30 giờ Việt Nam (UTC 17:30 thứ 5) — qua nửa đêm. */
const FRI_0030AM = new Date("2026-11-12T17:30:00Z")

describe("isOpenNow", () => {
  test("thiếu dữ liệu → null (không suy diễn)", () => {
    expect(isOpenNow(null, THU_10AM)).toBeNull()
    expect(isOpenNow("", THU_10AM)).toBeNull()
    expect(isOpenNow("   ", THU_10AM)).toBeNull()
  })

  test("24/7 luôn mở", () => {
    expect(isOpenNow("24/7", THU_10AM)).toBe(true)
    expect(isOpenNow("24/7", FRI_0030AM)).toBe(true)
  })

  test("khung đơn Mo-Su: trong giờ → true, ngoài giờ → false", () => {
    const hours = "Mo-Su 08:00-22:00"
    expect(isOpenNow(hours, THU_10AM)).toBe(true)
    // 23:30 cùng ngày — ngoài khung.
    expect(isOpenNow(hours, THU_1130PM)).toBe(false)
  })

  test("khung không có ngày áp dụng mọi ngày", () => {
    expect(isOpenNow("07:00-22:00", THU_10AM)).toBe(true)
  })

  test("nhiều khung theo nhóm ngày (Mo-Fr / Sa-Su)", () => {
    const hours = "Mo-Fr 07:00-17:30; Sa-Su 08:00-20:00"
    expect(isOpenNow(hours, THU_10AM)).toBe(true)
    // 23:30 thứ 5 — ngoài khung Mo-Fr.
    expect(isOpenNow(hours, THU_1130PM)).toBe(false)
  })

  test("khung qua nửa đêm (22:00-02:00) tính là mở sang hôm sau", () => {
    const hours = "Mo-Su 22:00-02:00"
    expect(isOpenNow(hours, THU_1130PM)).toBe(true)
    // 00:30 thứ 6 — vẫn nằm trong khung bắt đầu tối thứ 5.
    expect(isOpenNow(hours, FRI_0030AM)).toBe(true)
    // 10:00 sáng — ngoài khung.
    expect(isOpenNow(hours, THU_10AM)).toBe(false)
  })

  test("format lạ → null thay vì đoán", () => {
    expect(isOpenNow("mo-tu", THU_10AM)).toBeNull()
    expect(isOpenNow("08:00", THU_10AM)).toBeNull()
  })

  test("khung chỉ áp dụng đúng ngày trong tuần (Sa-Su)", () => {
    // Thứ 5 không thuộc Sa-Su.
    expect(isOpenNow("Sa-Su 08:00-20:00", THU_10AM)).toBe(false)
  })
})
