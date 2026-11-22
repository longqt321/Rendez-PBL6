import { describe, expect, test } from "bun:test"
import { computeInstantRunoffWinner } from "../src/lib/room-voting"

describe("computeInstantRunoffWinner (F-040 RCV)", () => {
  test("trả về ứng viên đạt đa số tuyệt đối ngay vòng 1", () => {
    const winner = computeInstantRunoffWinner(
      ["c1", "c2", "c3"],
      [
        { memberId: "m1", choices: ["c2", "c1"] },
        { memberId: "m2", choices: ["c2", "c3"] },
        { memberId: "m3", choices: ["c1", "c2"] },
      ],
    )
    expect(winner).toBe("c2")
  })

  test("loại ứng viên ít phiếu nhất và chuyển phiếu sang lựa chọn #2", () => {
    // Vòng 1: c1=2, c2=2, c3=1 -> loại c3 -> phiếu m5 chuyển sang c2 -> c2=3 (>50%)
    const winner = computeInstantRunoffWinner(
      ["c1", "c2", "c3"],
      [
        { memberId: "m1", choices: ["c1", "c2"] },
        { memberId: "m2", choices: ["c1", "c3"] },
        { memberId: "m3", choices: ["c2", "c1"] },
        { memberId: "m4", choices: ["c2", "c3"] },
        { memberId: "m5", choices: ["c3", "c2"] },
      ],
    )
    expect(winner).toBe("c2")
  })

  test("trả về null khi không có ứng viên", () => {
    expect(computeInstantRunoffWinner([], [])).toBeNull()
  })
})
