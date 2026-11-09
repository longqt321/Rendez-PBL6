import { describe, expect, it } from "vitest"
import { useNotifications, useUnreadNotificationCount } from "./use-notifications"
import { renderWithQuery, waitForQuery } from "@/test/query-test-utils"

/**
 * Test hook dữ liệu chạy qua mock adapter (axios thật + `mockAdapter` của
 * `src/mocks/server.ts`) — không mock module api.
 */
describe("useNotifications", () => {
  it("trả về thông báo có shape đúng AppNotification", async () => {
    const { result } = renderWithQuery(() => useNotifications())

    await waitForQuery(() => expect(result.current.notifications.length).toBeGreaterThan(0))

    for (const notification of result.current.notifications) {
      expect(typeof notification.id).toBe("string")
      expect(typeof notification.createdAt).toBe("string")
      expect(typeof notification.read).toBe("boolean")
      expect(["place-suggestion", "like", "comment", "follow", "system"]).toContain(
        notification.kind,
      )
    }
  })
})

describe("useUnreadNotificationCount", () => {
  it("trả về số chưa đọc là số nguyên >= 0", async () => {
    const { result } = renderWithQuery(() => useUnreadNotificationCount())

    await waitForQuery(() => expect(result.current.isSuccess).toBe(true))

    expect(typeof result.current.data).toBe("number")
    expect(result.current.data).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(result.current.data)).toBe(true)
  })
})
