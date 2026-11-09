import { act } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { usePosts } from "./use-posts"
import { waitForQuery, renderWithQuery } from "@/test/query-test-utils"

/**
 * Test hook dữ liệu chạy qua mock adapter (axios thật + `mockAdapter` của
 * `src/mocks/server.ts`) — không mock module api.
 */
describe("usePosts", () => {
  it("trang đầu trả về bài đăng có shape đúng Post", async () => {
    const { result } = renderWithQuery(() => usePosts({ filter: "all" }))

    await waitForQuery(() => expect(result.current.posts.length).toBeGreaterThan(0))

    for (const post of result.current.posts) {
      expect(typeof post.id).toBe("string")
      expect(typeof post.author.name).toBe("string")
      expect(typeof post.caption).toBe("string")
      expect(typeof post.likeCount).toBe("number")
      expect(typeof post.likedByMe).toBe("boolean")
    }
  })

  it("fetchNextPage tải thêm bài — mock trả 5 bài/trang nên next không null", async () => {
    const { result } = renderWithQuery(() => usePosts({ filter: "all" }))

    await waitForQuery(() => {
      expect(result.current.isSuccess).toBe(true)
      expect(result.current.posts.length).toBe(5)
    })
    // Mock server có nhiều hơn 5 bài → cursor phân trang còn tiếp.
    expect(result.current.hasNextPage).toBe(true)

    await act(async () => {
      await result.current.fetchNextPage()
    })
    await waitForQuery(() => expect(result.current.posts.length).toBeGreaterThan(5))
    expect(result.current.hasNextPage).toBe(true)
  })
})
