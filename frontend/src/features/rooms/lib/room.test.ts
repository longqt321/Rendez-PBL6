import { describe, expect, it } from "vitest"
import { describeProposal } from "./room"
import type { RoomProposal } from "../types/room"

describe("describeProposal", () => {
  const base: Omit<RoomProposal, "kind" | "field" | "value"> = {
    id: "p1",
    memberId: "m1",
    status: "open",
    createdAt: new Date().toISOString(),
  }

  it("include category → dấu cộng + nhãn loại hình", () => {
    const proposal: RoomProposal = {
      ...base,
      kind: "include",
      field: "category",
      value: "cafe",
    }
    expect(describeProposal(proposal)).toBe("＋ Loại hình: Cà phê")
  })

  it("exclude district → dấu trừ + tên quận", () => {
    const proposal: RoomProposal = {
      ...base,
      kind: "exclude",
      field: "district",
      value: "Hải Châu",
    }
    expect(describeProposal(proposal)).toBe("－ Quận: Hải Châu")
  })

  it("priceMax hợp lệ → nhãn mức giá; giá trị lạ → không tự quy về 3", () => {
    expect(describeProposal({ ...base, kind: "include", field: "priceMax", value: "2" })).toContain(
      "Mức giá tối đa",
    )
    expect(describeProposal({ ...base, kind: "include", field: "priceMax", value: "9" })).toContain(
      "—",
    )
  })

  it("keyword → nhãn từ khoá", () => {
    expect(describeProposal({ ...base, kind: "exclude", field: "keyword", value: "chay" })).toBe(
      "－ Từ khoá: chay",
    )
  })
})
