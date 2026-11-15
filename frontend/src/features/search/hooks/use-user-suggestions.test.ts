import { describe, expect, it } from "vitest"
import { renderWithQuery, waitForQuery } from "@/test/query-test-utils"
import { useUserSuggestions } from "./use-user-suggestions"

describe("useUserSuggestions", () => {
  it("đã đăng nhập → trả gợi ý kèm hồ sơ + lý do", async () => {
    const { result } = renderWithQuery(() => useUserSuggestions())

    await waitForQuery(() => expect(result.current.isSuccess).toBe(true))
    const items = result.current.data ?? []

    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThanOrEqual(5)
    for (const item of items) {
      expect(item.user.isMe).toBe(false)
      expect(item.user.followedByMe).toBe(false)
      expect(item.reason.length).toBeGreaterThan(0)
    }
  })
})
