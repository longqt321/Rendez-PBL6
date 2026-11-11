import { describe, expect, it } from "vitest"
import { mapAuthErrorMessage } from "./auth-error-messages"

describe("mapAuthErrorMessage", () => {
  it("dịch theo mã lỗi better-auth khi có `code`", () => {
    expect(mapAuthErrorMessage({ message: "Invalid token", code: "INVALID_TOKEN" })).toContain(
      "Link không hợp lệ",
    )
    expect(mapAuthErrorMessage({ message: "any", code: "TOKEN_EXPIRED" })).toContain("đã hết hạn")
  })

  it("dịch theo message tiếng Anh thô khi không có `code`", () => {
    expect(mapAuthErrorMessage({ message: "Invalid token" })).toContain("Link không hợp lệ")
    expect(mapAuthErrorMessage({ message: "User not found" })).toContain("Không tìm thấy")
  })

  it("giữ nguyên message tiếng Việt từ backend", () => {
    const message = "Email hoặc mật khẩu không đúng"
    expect(mapAuthErrorMessage({ message })).toBe(message)
  })
})
