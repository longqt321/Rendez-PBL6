import { describe, expect, it } from "vitest"
import { coldStartSrcSet } from "./cold-start-srcset"

describe("coldStartSrcSet", () => {
  it("URL cold-start → đúng 3 ứng viên (400/800/gốc 1200w)", () => {
    const result = coldStartSrcSet("/data/cold-start/images/venues/mirko-coffee-gm-1.jpg", "50vw")
    expect(result).toEqual({
      srcSet:
        "/data/cold-start/images/venues/mirko-coffee-gm-1-400.webp 400w, " +
        "/data/cold-start/images/venues/mirko-coffee-gm-1-800.webp 800w, " +
        "/data/cold-start/images/venues/mirko-coffee-gm-1.jpg 1200w",
      sizes: "50vw",
    })
  })

  it("URL R2 / ngoài dataset → undefined (giữ src gốc)", () => {
    expect(coldStartSrcSet("https://r2.example.com/media/abc.jpg", "50vw")).toBeUndefined()
    expect(coldStartSrcSet("/uploads/other.png", "50vw")).toBeUndefined()
  })
})
