import { describe, expect, it } from "vitest"
import { envSchema } from "./env"

describe("envSchema", () => {
  it("chấp nhận chuỗi rỗng/khoảng trắng và rơi về giá trị mặc định", () => {
    const result = envSchema.safeParse({
      VITE_API_BASE_URL: "",
      VITE_ENABLE_MOCKS: "   ",
      VITE_DEV_BYPASS_AUTH: "",
      VITE_MOCK_SCENARIO: "",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        VITE_API_BASE_URL: "/api/v1",
        VITE_ENABLE_MOCKS: undefined,
        VITE_DEV_BYPASS_AUTH: undefined,
        VITE_MOCK_SCENARIO: undefined,
      })
    }
  })

  it("từ chối giá trị không hợp lệ", () => {
    const result = envSchema.safeParse({
      VITE_ENABLE_MOCKS: "maybe",
    })
    expect(result.success).toBe(false)
  })

  it("giữ nguyên giá trị hợp lệ", () => {
    const result = envSchema.safeParse({
      VITE_API_BASE_URL: "/custom/api",
      VITE_ENABLE_MOCKS: "false",
      VITE_DEV_BYPASS_AUTH: "true",
      VITE_MOCK_SCENARIO: "slow",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        VITE_API_BASE_URL: "/custom/api",
        VITE_ENABLE_MOCKS: "false",
        VITE_DEV_BYPASS_AUTH: "true",
        VITE_MOCK_SCENARIO: "slow",
      })
    }
  })
})
