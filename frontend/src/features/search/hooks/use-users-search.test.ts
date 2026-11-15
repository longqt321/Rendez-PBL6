import { describe, expect, it } from "vitest"
import { renderWithQuery, waitForQuery } from "@/test/query-test-utils"
import { useUsersSearch } from "./use-users-search"

describe("useUsersSearch", () => {
  it("tìm theo từ khoá trả về đúng người khớp tên/handle", async () => {
    const { result } = renderWithQuery(() => useUsersSearch("minh anh"))

    await waitForQuery(() => expect(result.current.isSuccess).toBe(true))
    const people = result.current.data?.pages.flatMap((page) => page.items) ?? []
    expect(people.length).toBeGreaterThan(0)
    expect(people[0]?.handle).toBe("minhanh.eats")
  })

  it("tìm không khớp ai → danh sách rỗng, không lỗi", async () => {
    const { result } = renderWithQuery(() => useUsersSearch("khong-ai-nhu-the"))

    await waitForQuery(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.pages.flatMap((page) => page.items)).toEqual([])
  })

  it("đổi từ khoá → query key đổi, kết quả theo từ khoá mới", async () => {
    let q = "minh anh"
    const { result, rerender } = renderWithQuery(() => useUsersSearch(q))
    await waitForQuery(() => expect(result.current.isSuccess).toBe(true))

    q = "khong-ai-nhu-the"
    rerender()
    await waitForQuery(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.pages.flatMap((page) => page.items)).toEqual([])
  })
})
