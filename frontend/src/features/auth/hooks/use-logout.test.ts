import { waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { createTestQueryClient, renderWithQuery, waitForQuery } from "@/test/query-test-utils"
import { useMe } from "@/features/profile/hooks/use-me"
import { ACTIVE_ROOM_KEY } from "@/features/rooms/lib/room"
import { useLogin } from "./use-login"
import { useLogout } from "./use-logout"

describe("useLogout", () => {
  it("đăng xuất → GET /me trả 401 (chưa đăng nhập) và xoá phòng đang hoạt động", async () => {
    sessionStorage.setItem(ACTIVE_ROOM_KEY, "ROOM99")
    const client = createTestQueryClient()
    const { result } = renderWithQuery(() => useLogout(), client)

    result.current.mutate()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(sessionStorage.getItem(ACTIVE_ROOM_KEY)).toBeNull()

    const { result: me } = renderWithQuery(() => useMe(), client)
    await waitForQuery(() => expect(me.current.isError).toBe(true))
    expect(me.current.error?.message).toContain("Chưa đăng nhập")

    // Đăng nhập lại ngay trong test: vừa kiểm vòng đời phiên, vừa trả mock về
    // trạng thái ban đầu để test khác không phụ thuộc thứ tự chạy.
    const { result: login } = renderWithQuery(() => useLogin(), client)
    login.current.mutate({ email: "me@rendez.test", password: "password123" })
    await waitFor(() => expect(login.current.isSuccess).toBe(true))
  })

  it("đăng nhập lại → GET /me trả hồ sơ hiện tại", async () => {
    const client = createTestQueryClient()
    const { result } = renderWithQuery(() => useLogin(), client)

    result.current.mutate({ email: "me@rendez.test", password: "password123" })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.handle).toBe("minhanh.eats")

    const { result: me } = renderWithQuery(() => useMe(), client)
    await waitForQuery(() => expect(me.current.isSuccess).toBe(true))
    expect(me.current.data?.handle).toBe("minhanh.eats")
  })
})
