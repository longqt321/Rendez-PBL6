import { describe, expect, test } from "bun:test"
import {
  maskEmailForAdmin,
  maskIpForAdmin,
  resolveAdminRuntimeEnv,
  sanitizeObservabilityMessage,
  shouldMaskAdminPii,
} from "../src/lib/admin-privacy"

describe("admin-privacy", () => {
  test("resolveAdminRuntimeEnv phân biệt đúng development, staging và production", () => {
    expect(resolveAdminRuntimeEnv("development", undefined)).toBe("development")
    expect(resolveAdminRuntimeEnv("test", undefined)).toBe("development")
    expect(resolveAdminRuntimeEnv("production", undefined)).toBe("production")
    expect(resolveAdminRuntimeEnv("production", "staging")).toBe("staging")
    expect(resolveAdminRuntimeEnv("development", "production")).toBe("production")
  })

  test("shouldMaskAdminPii chỉ tắt ở development", () => {
    expect(shouldMaskAdminPii("development")).toBe(false)
    expect(shouldMaskAdminPii("staging")).toBe(true)
    expect(shouldMaskAdminPii("production")).toBe(true)
  })

  test("maskEmailForAdmin che đúng phần local qua maskdata khi mask=true", () => {
    expect(maskEmailForAdmin("longqt321@gmail.com", false)).toBe("longqt321@gmail.com")
    expect(maskEmailForAdmin("longqt321@gmail.com", true)).toBe("lo*******@gmail.com")
    expect(maskEmailForAdmin("a@rendez.local", true)).toContain("@rendez.local")
    expect(maskEmailForAdmin("invalid-email", true)).toBe("***")
  })

  test("maskIpForAdmin che octet cuối IPv4 và phần đuôi IPv6", () => {
    expect(maskIpForAdmin("113.161.42.98", false)).toBe("113.161.42.98")
    expect(maskIpForAdmin("113.161.42.98", true)).toBe("113.161.42.***")
    expect(maskIpForAdmin("2001:db8:85a3::8a2e:370:7334", true)).toBe("2001:db8:85a3:****")
    expect(maskIpForAdmin(null, true)).toBeNull()
  })

  test("sanitizeObservabilityMessage bỏ stack trace và đường dẫn nội bộ ở prod", () => {
    const raw =
      "Database error at /home/longtran/Projects/rendez/backend/src/routes/admin.ts:120:5\n    at next (/app/node_modules/hono/index.js:12:3)"
    expect(sanitizeObservabilityMessage(raw, false)).toBe(raw)
    expect(sanitizeObservabilityMessage(raw, true)).toBe("Database error at [internal-path]")
  })
})
