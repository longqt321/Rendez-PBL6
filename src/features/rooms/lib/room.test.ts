import { describe, expect, it } from "vitest"
import {
  addProposal,
  applyProposal,
  createRoom,
  describeProposal,
  dismissProposal,
  joinRoom,
  leaveRoom,
  memberIdFor,
} from "./room"

describe("createRoom", () => {
  it("chủ phòng là ME và chưa có đề xuất", () => {
    const room = createRoom("Đi ăn thứ 6", "ABC123")
    expect(room.code).toBe("ABC123")
    expect(room.members).toHaveLength(1)
    expect(room.members[0]?.isMe).toBe(true)
    expect(room.proposals).toHaveLength(0)
  })

  it("tên trống thì dùng tên mặc định", () => {
    expect(createRoom("   ", "ABC123").name).toBe("Phòng lọc nhóm")
  })
})

describe("memberIdFor", () => {
  it("cố định cho cùng (phòng, tên) và không phân biệt hoa/thường", () => {
    expect(memberIdFor("ABC123", "Lan")).toBe(memberIdFor("ABC123", "  lan "))
  })
})

describe("joinRoom", () => {
  const room = createRoom("Nhóm", "ABC123")

  it("thêm thành viên mới", () => {
    const result = joinRoom(room, "Lan", memberIdFor("ABC123", "Lan"))
    expect(result.status).toBe("joined")
    if (result.status === "joined") expect(result.room.members).toHaveLength(2)
  })

  it("chặn trùng tên (không phân biệt hoa/thường)", () => {
    expect(joinRoom(room, "BẠN", memberIdFor("ABC123", "BẠN")).status).toBe("duplicate")
  })

  it("chặn tên rỗng", () => {
    expect(joinRoom(room, "   ", "x").status).toBe("duplicate")
  })
})

describe("applyProposal", () => {
  it("include loại hình vào bộ lọc và đánh dấu applied", () => {
    const withProposal = addProposal(createRoom("Nhóm", "ABC123"), {
      memberId: "u-me",
      kind: "include",
      field: "category",
      value: "cafe",
    })
    const proposalId = withProposal.proposals[0].id
    const applied = applyProposal(withProposal, proposalId)

    expect(applied.filter.categories).toEqual(["cafe"])
    expect(applied.proposals[0]?.status).toBe("applied")
  })

  it("exclude loại hình loại khỏi danh sách include", () => {
    let room = addProposal(createRoom("Nhóm", "ABC123"), {
      memberId: "u-me",
      kind: "include",
      field: "category",
      value: "cafe",
    })
    room = applyProposal(room, room.proposals[0].id)
    room = addProposal(room, {
      memberId: "u-me",
      kind: "exclude",
      field: "category",
      value: "cafe",
    })
    const applied = applyProposal(room, room.proposals[0].id)

    expect(applied.filter.categories).toEqual([])
    expect(applied.filter.excludedCategories).toEqual(["cafe"])
  })

  it("đề xuất đã xử lý thì không áp dụng lại", () => {
    let room = addProposal(createRoom("Nhóm", "ABC123"), {
      memberId: "u-me",
      kind: "include",
      field: "keyword",
      value: "hải sản",
    })
    const id = room.proposals[0].id
    room = applyProposal(room, id)
    const again = applyProposal(room, id)

    expect(again).toBe(room)
  })
})

describe("dismissProposal", () => {
  it("đánh dấu dismissed, không đổi filter", () => {
    const room = addProposal(createRoom("Nhóm", "ABC123"), {
      memberId: "u-me",
      kind: "include",
      field: "district",
      value: "Hải Châu",
    })
    const dismissed = dismissProposal(room, room.proposals[0].id)

    expect(dismissed.proposals[0]?.status).toBe("dismissed")
    expect(dismissed.filter.districts).toEqual([])
  })
})

describe("leaveRoom", () => {
  it("xoá thành viên và đề xuất của họ, giữ thành viên khác", () => {
    const joined = joinRoom(createRoom("Nhóm", "ABC123"), "Lan", memberIdFor("ABC123", "Lan"))
    if (joined.status !== "joined") throw new Error("join phải thành công")
    const withProposal = addProposal(joined.room, {
      memberId: memberIdFor("ABC123", "Lan"),
      kind: "include",
      field: "keyword",
      value: "hải sản",
    })
    const left = leaveRoom(withProposal, memberIdFor("ABC123", "Lan"))

    expect(left.members).toHaveLength(1)
    expect(left.members[0]?.isMe).toBe(true)
    expect(left.proposals).toHaveLength(0)
  })
})

describe("describeProposal", () => {
  it("mô tả đề xuất loại hình bằng nhãn tiếng Việt", () => {
    const room = addProposal(createRoom("Nhóm", "ABC123"), {
      memberId: "u-me",
      kind: "include",
      field: "category",
      value: "cafe",
    })
    expect(describeProposal(room.proposals[0])).toBe("＋ Loại hình: Cà phê")
  })
})
