import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useRooms } from "./use-rooms"

/**
 * Hook phòng lọc nhóm chạy qua mock adapter (axios thật + `mockAdapter`) —
 * kiểm luồng tạo phòng → đề xuất → áp dụng → rời phòng với state thật.
 */
describe("useRooms", () => {
  it("tạo phòng → thêm đề xuất → áp dụng → rời phòng", async () => {
    const { result } = renderHook(() => useRooms())

    let code = ""
    await act(async () => {
      code = await result.current.createRoom("Nhóm test")
    })
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{6}$/u)
    expect(result.current.activeCode).toBe(code)

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

    const proposalId = result.current.rooms[code]!.proposals[0]!.id
    let summary = ""
    await act(async () => {
      summary = await result.current.applyProposal(code, proposalId)
    })
    expect(summary).toBe("＋ Loại hình: Cà phê")
    expect(result.current.rooms[code]?.filter.categories).toEqual(["cafe"])
    expect(result.current.rooms[code]?.proposals[0]?.status).toBe("applied")

    await act(async () => {
      await result.current.leaveRoom(code)
    })
    expect(result.current.activeCode).toBe("")
    expect(result.current.rooms[code]).toBeUndefined()
  })

  it("join mã sai → not-found; join lại phòng đang có cookie → already", async () => {
    const { result } = renderHook(() => useRooms())

    let code = ""
    await act(async () => {
      code = await result.current.createRoom("Nhóm join")
    })

    await act(async () => {
      const status = await result.current.joinRoom("ZZZZZZ", "Khách")
      expect(status).toBe("not-found")
    })

    // Mock cấp "cookie" token khi tạo phòng; join lại cùng phòng (kể cả tên
    // khác) khớp token → server trả 200 + joined:false → "already", KHÔNG
    // phải "duplicate" (trùng tên thật do server trả 409 — test ở backend).
    await act(async () => {
      const status = await result.current.joinRoom(code, "Tên khác")
      expect(status).toBe("already")
    })
    expect(result.current.activeCode).toBe(code)
    expect(result.current.rooms[code]?.members).toHaveLength(1)
  })
})
