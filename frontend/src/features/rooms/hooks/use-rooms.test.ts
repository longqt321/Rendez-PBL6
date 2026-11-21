import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useRooms } from "./use-rooms"

describe("useRooms", () => {
  it("tạo phòng -> thêm đề xuất -> áp dụng -> toggle/gỡ/reset filter -> rời phòng", async () => {
    const { result } = renderHook(() => useRooms())

    let code = ""
    await act(async () => {
      code = await result.current.createRoom("Nhóm test")
    })
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{6}$/u)
    expect(result.current.activeCode).toBe(code)

    // 1. Gửi đề xuất chờ duyệt rồi áp dụng thủ công
    await act(async () => {
      await result.current.addMyProposal(code, {
        kind: "include",
        field: "category",
        value: "cafe",
      })
    })
    await waitFor(() => {
      expect(result.current.rooms[code]?.proposals).toHaveLength(1)
    })
    expect(result.current.rooms[code]?.proposals[0]?.status).toBe("open")

    const proposalId = result.current.rooms[code].proposals[0].id
    let summary = ""
    await act(async () => {
      summary = await result.current.applyProposal(code, proposalId)
    })
    expect(summary).toBe("＋ Loại hình: Cà phê")
    expect(result.current.rooms[code]?.filter.categories).toEqual(["cafe"])
    expect(result.current.rooms[code]?.proposals[0]?.status).toBe("applied")

    // 2. Gửi batch proposals với autoApply: true (chế độ nhập tự nhiên nối tiếp)
    await act(async () => {
      await result.current.addMyProposals(
        code,
        [
          { kind: "include", field: "district", value: "Hải Châu" },
          { kind: "exclude", field: "keyword", value: "hải sản" },
        ],
        { autoApply: true, mode: "append" },
      )
    })
    expect(result.current.rooms[code]?.filter.categories).toEqual(["cafe"])
    expect(result.current.rooms[code]?.filter.districts).toEqual(["Hải Châu"])
    expect(result.current.rooms[code]?.filter.excludeKeywords).toEqual(["hải sản"])

    // 2b. Gửi batch proposals với mode: "replace" (ghi đè toàn bộ bộ lọc cũ)
    await act(async () => {
      await result.current.addMyProposals(
        code,
        [
          { kind: "include", field: "category", value: "restaurant" },
          { kind: "include", field: "district", value: "Sơn Trà" },
        ],
        { autoApply: true, mode: "replace" },
      )
    })
    expect(result.current.rooms[code]?.filter.categories).toEqual(["restaurant"])
    expect(result.current.rooms[code]?.filter.districts).toEqual(["Sơn Trà"])
    expect(result.current.rooms[code]?.filter.excludeKeywords).toEqual([])

    // 3. Toggle / remove / reset trực tiếp trên filter nhóm
    await act(async () => {
      await result.current.updateRoomFilter(code, {
        action: "remove",
        kind: "include",
        field: "category",
        value: "restaurant",
      })
    })
    expect(result.current.rooms[code]?.filter.categories).toEqual([])

    await act(async () => {
      await result.current.updateRoomFilter(code, {
        action: "toggle",
        kind: "include",
        field: "priceMax",
        value: "1",
      })
    })
    expect(result.current.rooms[code]?.filter.priceMax).toBe(1)

    await act(async () => {
      await result.current.updateRoomFilter(code, { action: "reset" })
    })
    expect(result.current.rooms[code]?.filter.districts).toEqual([])
    expect(result.current.rooms[code]?.filter.excludeKeywords).toEqual([])
    expect(result.current.rooms[code]?.filter.priceMax).toBeUndefined()

    await act(async () => {
      await result.current.leaveRoom(code)
    })
    expect(result.current.activeCode).toBe("")
    expect(result.current.rooms[code]).toBeUndefined()
  })

  it("join mã sai -> not-found; join lại phòng đang có cookie -> already", async () => {
    const { result } = renderHook(() => useRooms())

    let code = ""
    await act(async () => {
      code = await result.current.createRoom("Nhóm join")
    })

    await act(async () => {
      const status = await result.current.joinRoom("ZZZZZZ", "Khách")
      expect(status).toBe("not-found")
    })

    await act(async () => {
      const status = await result.current.joinRoom(code, "Tên khác")
      expect(status).toBe("already")
    })
    expect(result.current.activeCode).toBe(code)
    expect(result.current.rooms[code]?.members).toHaveLength(1)
  })
})
