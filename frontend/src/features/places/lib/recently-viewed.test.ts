import { beforeEach, describe, expect, it } from "vitest"
import { getRecentlyViewedIds, recordPlaceView, RECENTLY_VIEWED_LIMIT } from "./recently-viewed"

beforeEach(() => {
  localStorage.clear()
})

describe("recently-viewed", () => {
  it("mặc định rỗng khi chưa xem gì", () => {
    expect(getRecentlyViewedIds()).toEqual([])
  })

  it("recordPlaceView đưa id mới nhất lên đầu", () => {
    recordPlaceView("a")
    recordPlaceView("b")
    expect(getRecentlyViewedIds()).toEqual(["b", "a"])
  })

  it("bỏ trùng: xem lại id cũ thì id đó lên đầu, không nhân đôi", () => {
    recordPlaceView("a")
    recordPlaceView("b")
    recordPlaceView("a")
    expect(getRecentlyViewedIds()).toEqual(["a", "b"])
  })

  it(`cắt còn ${RECENTLY_VIEWED_LIMIT} id gần nhất`, () => {
    for (let index = 0; index < RECENTLY_VIEWED_LIMIT + 3; index++) {
      recordPlaceView(`p-${index}`)
    }
    const ids = getRecentlyViewedIds()
    expect(ids).toHaveLength(RECENTLY_VIEWED_LIMIT)
    expect(ids[0]).toBe(`p-${RECENTLY_VIEWED_LIMIT + 2}`)
    expect(ids).not.toContain("p-0")
  })
})
