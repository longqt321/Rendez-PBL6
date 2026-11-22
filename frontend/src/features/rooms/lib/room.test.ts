import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  ACTIVE_ROOM_KEY,
  clearActiveRoom,
  describeProposal,
  naturalQueryToProposalInputs,
  roomFilterChips,
} from "./room"
import type { Room, RoomProposal } from "../types/room"

describe("describeProposal", () => {
  const base: Omit<RoomProposal, "kind" | "field" | "value"> = {
    id: "p1",
    memberId: "m1",
    status: "open",
    createdAt: new Date().toISOString(),
  }

  it("include category -> dấu cộng + nhãn loại hình", () => {
    const proposal: RoomProposal = {
      ...base,
      kind: "include",
      field: "category",
      value: "cafe",
    }
    expect(describeProposal(proposal)).toBe("＋ Loại hình: Cà phê")
  })

  it("exclude district -> dấu trừ + tên quận", () => {
    const proposal: RoomProposal = {
      ...base,
      kind: "exclude",
      field: "district",
      value: "Hải Châu",
    }
    expect(describeProposal(proposal)).toBe("－ Quận: Hải Châu")
  })

  it("priceMax hợp lệ -> nhãn mức giá; giá trị lạ -> không tự quy về 3", () => {
    expect(describeProposal({ ...base, kind: "include", field: "priceMax", value: "2" })).toContain(
      "Mức giá tối đa",
    )
    expect(describeProposal({ ...base, kind: "include", field: "priceMax", value: "9" })).toContain(
      "—",
    )
  })

  it("keyword -> nhãn từ khoá", () => {
    expect(describeProposal({ ...base, kind: "exclude", field: "keyword", value: "chay" })).toBe(
      "－ Từ khoá: chay",
    )
  })
})

describe("naturalQueryToProposalInputs & roomFilterChips", () => {
  it("chuyển câu gõ tự nhiên có dấu phẩy và phủ định thành nhiều đề xuất chuẩn", () => {
    const items = naturalQueryToProposalInputs("cà phê Sơn Trà dưới 50k, yên tĩnh, không hải sản")
    expect(items).toEqual([
      { kind: "include", field: "category", value: "cafe" },
      { kind: "include", field: "district", value: "Sơn Trà" },
      { kind: "include", field: "priceMax", value: "1" },
      { kind: "include", field: "keyword", value: "yên tĩnh" },
      { kind: "exclude", field: "keyword", value: "hải sản" },
    ])
  })

  it("roomFilterChips trả về đầy đủ field/value để gỡ từng thẻ bằng 1 cú bấm", () => {
    const room: Room = {
      id: "r1",
      code: "AB23CD",
      name: "Nhóm chill",
      phase: "filtering",
      votingMode: "swipe_match",
      candidates: [],
      voteSummaries: [],
      votingProgress: { votedMemberIds: [], totalActiveMembers: 0, matchedCandidateIds: [] },
      members: [],
      proposals: [],
      filter: {
        categories: ["cafe"],
        excludedCategories: ["bar"],
        districts: ["Hải Châu"],
        excludedDistricts: ["Cẩm Lệ"],
        includeKeywords: ["yên tĩnh"],
        excludeKeywords: ["ồn"],
        priceMax: 1,
      },
      createdAt: new Date().toISOString(),
    }

    const chips = roomFilterChips(room)
    expect(chips).toEqual([
      { kind: "include", field: "category", value: "cafe", label: "Cà phê" },
      { kind: "exclude", field: "category", value: "bar", label: "Không quán bar" },
      { kind: "include", field: "district", value: "Hải Châu", label: "Hải Châu" },
      { kind: "exclude", field: "district", value: "Cẩm Lệ", label: "Không Cẩm Lệ" },
      { kind: "include", field: "priceMax", value: "1", label: "Tối đa ₫" },
      { kind: "include", field: "keyword", value: "yên tĩnh", label: "Có “yên tĩnh”" },
      { kind: "exclude", field: "keyword", value: "ồn", label: "Không “ồn”" },
    ])
  })
})

describe("clearActiveRoom", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it("xoá ACTIVE_ROOM_KEY khỏi sessionStorage và phát StorageEvent", () => {
    sessionStorage.setItem(ACTIVE_ROOM_KEY, "AB23CD")
    const handler = vi.fn()
    window.addEventListener("storage", handler)

    clearActiveRoom()

    expect(sessionStorage.getItem(ACTIVE_ROOM_KEY)).toBeNull()
    expect(handler).toHaveBeenCalledTimes(1)
    const event = handler.mock.calls[0]?.[0] as StorageEvent
    expect(event.key).toBe(ACTIVE_ROOM_KEY)
    expect(event.newValue).toBeNull()

    window.removeEventListener("storage", handler)
  })
})
