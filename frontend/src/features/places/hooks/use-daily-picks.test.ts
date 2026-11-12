import { describe, expect, it } from "vitest"
import { placeSchema } from "@rendez/schema"
import { useDailyPicks } from "./use-daily-picks"
import { renderWithQuery, waitForQuery } from "@/test/query-test-utils"

/**
 * Test hook dữ liệu chạy qua mock adapter (axios thật + `mockAdapter`) — không
 * mock module api. Mock trả 3 quán công khai đầu tiên của fixture cold-start.
 */
describe("useDailyPicks", () => {
  it("trả 3 gợi ý khớp shape Place + reason", async () => {
    const { result } = renderWithQuery(() => useDailyPicks())

    await waitForQuery(() => expect(result.current.isSuccess).toBe(true))

    const data = result.current.data
    expect(data?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/u)
    expect(data?.items).toHaveLength(3)
    for (const item of data?.items ?? []) {
      expect(placeSchema.safeParse(item.place).success).toBe(true)
      expect(item.reason.length).toBeGreaterThan(0)
    }
  })
})
