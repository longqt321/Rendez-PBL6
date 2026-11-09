import { waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { renderWithQuery, waitForQuery } from "@/test/query-test-utils"
import { useMe } from "./use-me"
import { useUpdateMe } from "./use-update-me"

/** Test chạy qua mock adapter (axios thật + mockAdapter), không mock module api. */
describe("useUpdateMe", () => {
  it("lưu hồ sơ thành công → server trả hồ sơ đã cập nhật", async () => {
    const { result } = renderWithQuery(() => useUpdateMe())

    result.current.mutate({
      name: "Minh Anh Test",
      bio: "Bio mới",
      location: "Hải Châu",
      privateProfile: true,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.name).toBe("Minh Anh Test")
    expect(result.current.data?.privateProfile).toBe(true)
  })

  it("tên quá ngắn → server từ chối với thông báo rõ ràng", async () => {
    const { result } = renderWithQuery(() => useUpdateMe())

    result.current.mutate({
      name: "A",
      bio: "",
      location: "",
      privateProfile: false,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain("ít nhất 2 ký tự")
  })

  it("sau khi lưu, GET /me trả dữ liệu mới (mutation ghi đè cache)", async () => {
    // Mutation và query dùng chung một QueryClient — như trong app thật.
    const { result: update } = renderWithQuery(() => useUpdateMe())

    update.current.mutate({
      name: "Minh Anh Test",
      bio: "Bio mới",
      location: "Đà Nẵng",
      privateProfile: false,
    })
    await waitFor(() => expect(update.current.isSuccess).toBe(true))

    const { result: me } = renderWithQuery(() => useMe())
    await waitForQuery(() => expect(me.current.isSuccess).toBe(true))
    expect(me.current.data?.name).toBe("Minh Anh Test")
  })
})
