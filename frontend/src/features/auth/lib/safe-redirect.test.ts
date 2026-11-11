import { describe, expect, it } from "vitest"
import { safeRedirectPath } from "./safe-redirect"

describe("safeRedirectPath", () => {
  it("nhận path relative hợp lệ", () => {
    expect(safeRedirectPath("/profile")).toBe("/profile")
    expect(safeRedirectPath("/discover/noi-cafe?tab=review")).toBe("/discover/noi-cafe?tab=review")
  })

  it("từ chối URL tuyệt đối và path giao thức-độc lập (open redirect)", () => {
    expect(safeRedirectPath("https://evil.example.com")).toBeNull()
    expect(safeRedirectPath("//evil.example.com")).toBeNull()
    expect(safeRedirectPath("/\\evil.example.com")).toBeNull()
    expect(safeRedirectPath("javascript:alert(1)")).toBeNull()
  })

  it("từ chối rỗng, ký tự điều khiển và path auth (vòng lặp)", () => {
    expect(safeRedirectPath(null)).toBeNull()
    expect(safeRedirectPath("")).toBeNull()
    expect(safeRedirectPath("/pro\u0000file")).toBeNull()
    expect(safeRedirectPath("/login")).toBeNull()
    expect(safeRedirectPath("/register?next=/profile")).toBeNull()
  })
})
