import { waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { createTestQueryClient, renderWithQuery } from "@/test/query-test-utils"
import { recordPlaceView } from "../lib/recently-viewed"
import { useRecentlyViewed } from "./use-recently-viewed"

const viewer = vi.hoisted((): { id: string | null } => ({ id: "user-1" }))
vi.mock("@/features/profile/hooks/use-me", () => ({
  useMe: () => ({
    data: viewer.id ? { id: viewer.id, name: "Test" } : undefined,
    isPending: false,
  }),
}))

vi.mock("../api/get-place-detail", () => ({
  getPlace: (id: string) => Promise.resolve({ id, name: `Place ${id}` }),
}))

describe("useRecentlyViewed — tách theo tài khoản", () => {
  beforeEach(() => {
    localStorage.clear()
    viewer.id = "user-1"
  })

  it("mỗi tài khoản chỉ thấy lịch sử của chính mình", async () => {
    recordPlaceView("p-user1", "user-1")
    recordPlaceView("p-user2", "user-2")
    recordPlaceView("p-guest")

    const client = createTestQueryClient()
    const { result, rerender } = renderWithQuery(() => useRecentlyViewed(), client)

    await waitFor(() => expect(result.current.data?.map((p) => p.id)).toEqual(["p-user1"]))

    // Đổi sang tài khoản khác trên cùng trình duyệt: danh sách phải đổi theo.
    viewer.id = "user-2"
    rerender()

    await waitFor(() => expect(result.current.data?.map((p) => p.id)).toEqual(["p-user2"]))

    // Đăng xuất (khách) chỉ thấy lịch sử khách.
    viewer.id = null
    rerender()

    await waitFor(() => expect(result.current.data?.map((p) => p.id)).toEqual(["p-guest"]))
  })
})
