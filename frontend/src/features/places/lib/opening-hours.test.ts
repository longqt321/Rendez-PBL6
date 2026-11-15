import { describe, expect, it } from "vitest"
import { isOpenNow } from "./opening-hours"

const MON = "2024-01-01" // Thứ hai
const SAT = "2024-01-06" // Thứ bảy
const SUN = "2024-01-07" // Chủ nhật

function vn(day: string, time: string): Date {
  return new Date(`${day}T${time}:00+07:00`)
}

describe("isOpenNow", () => {
  it("trả null khi không có dữ liệu", () => {
    expect(isOpenNow(null)).toBeNull()
    expect(isOpenNow("")).toBeNull()
    expect(isOpenNow("   ")).toBeNull()
  })

  it("24/7 luôn mở", () => {
    expect(isOpenNow("24/7", vn(MON, "03:12"))).toBe(true)
    expect(isOpenNow("24/7", vn(SUN, "23:59"))).toBe(true)
  })

  it("Mo-Su 08:00-22:00 — khung mọi ngày", () => {
    const hours = "Mo-Su 08:00-22:00"
    expect(isOpenNow(hours, vn(MON, "08:00"))).toBe(true)
    expect(isOpenNow(hours, vn(MON, "21:59"))).toBe(true)
    expect(isOpenNow(hours, vn(MON, "22:00"))).toBe(false)
    expect(isOpenNow(hours, vn(SUN, "07:59"))).toBe(false)
  })

  it("Mo-Fr 07:00-17:30; Sa-Su 08:00-20:00 — ngày khác giờ khác", () => {
    const hours = "Mo-Fr 07:00-17:30; Sa-Su 08:00-20:00"
    expect(isOpenNow(hours, vn(MON, "07:00"))).toBe(true)
    expect(isOpenNow(hours, vn(MON, "17:30"))).toBe(false)
    expect(isOpenNow(hours, vn(SAT, "07:59"))).toBe(false)
    expect(isOpenNow(hours, vn(SAT, "08:00"))).toBe(true)
    expect(isOpenNow(hours, vn(SUN, "20:00"))).toBe(false)
  })

  it("nhiều khung giờ trong ngày, phân tách ; hoặc ,", () => {
    const hours = "Mo-Su 11:30-14:00, 18:00-21:30"
    expect(isOpenNow(hours, vn(MON, "12:00"))).toBe(true)
    expect(isOpenNow(hours, vn(MON, "15:00"))).toBe(false)
    expect(isOpenNow(hours, vn(MON, "19:00"))).toBe(true)
    expect(isOpenNow("Mo-Th 09:00-22:30; Fr-Su 09:00-23:30", vn(SAT, "23:00"))).toBe(true)
    expect(isOpenNow("Mo-Th 09:00-22:30; Fr-Su 09:00-23:30", vn(MON, "22:45"))).toBe(false)
  })

  it("giờ có giây HH:MM:SS", () => {
    expect(isOpenNow("Mo-Su 08:00:00-22:00:00", vn(MON, "08:00"))).toBe(true)
    expect(isOpenNow("Mo-Su 08:00:00-22:00:00", vn(MON, "07:59"))).toBe(false)
  })

  it("khung không có ngày áp dụng mọi ngày", () => {
    const hours = "07:00-22:00"
    expect(isOpenNow(hours, vn(MON, "10:00"))).toBe(true)
    expect(isOpenNow(hours, vn(SUN, "23:00"))).toBe(false)
  })

  it("khung qua nửa đêm tính là mở sang hôm sau", () => {
    const hours = "Mo-Su 22:00-02:00"
    expect(isOpenNow(hours, vn(MON, "23:30"))).toBe(true)
    expect(isOpenNow(hours, vn(MON, "01:59"))).toBe(true)
    expect(isOpenNow(hours, vn(MON, "02:00"))).toBe(false)
    expect(isOpenNow(hours, vn(MON, "21:59"))).toBe(false)
  })

  it("đúng thứ trong tuần", () => {
    // Chỉ mở thứ bảy, chủ nhật.
    const hours = "Sa-Su 08:00-20:00"
    expect(isOpenNow(hours, vn(SAT, "09:00"))).toBe(true)
    expect(isOpenNow(hours, vn(MON, "09:00"))).toBe(false)
    // Range quấn tuần: Fr-Su gồm Fr, Sa, Su.
    expect(isOpenNow("Fr-Su 09:00-18:00", vn(SUN, "10:00"))).toBe(true)
    expect(isOpenNow("Fr-Su 09:00-18:00", vn(MON, "10:00"))).toBe(false)
  })

  it("format lệch/lạ → null thay vì đoán", () => {
    expect(isOpenNow("mở cả ngày", vn(MON, "10:00"))).toBeNull()
    expect(isOpenNow("Mo-Su", vn(MON, "10:00"))).toBeNull()
    expect(isOpenNow("25:00-26:00", vn(MON, "10:00"))).toBeNull()
    expect(isOpenNow("Mo-Su 8h-22h", vn(MON, "10:00"))).toBeNull()
  })

  it("so theo múi giờ Việt Nam bất kể múi giờ máy", () => {
    // 2024-01-01T18:00:00Z = 01:00 sáng thứ hai tại VN (khung 22:00-02:00 còn mở).
    expect(isOpenNow("Mo-Su 22:00-02:00", new Date("2024-01-01T18:00:00Z"))).toBe(true)
    // Cùng thời điểm theo UTC+0 là 18:00 — nếu so nhầm múi giờ máy sẽ ra kết quả khác.
    expect(isOpenNow("Mo-Su 08:00-22:00", new Date("2024-01-01T18:00:00Z"))).toBe(false)
  })
})
