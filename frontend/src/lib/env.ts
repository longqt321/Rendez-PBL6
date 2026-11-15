import { z } from "zod"

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1).default("/api/v1"),

  VITE_ENABLE_MOCKS: z.enum(["true", "false"]).optional(),

  VITE_DEV_BYPASS_AUTH: z.enum(["true", "false"]).optional(),

  VITE_MOCK_SCENARIO: z
    .enum(["ok", "slow", "empty", "server-error", "unauthorized", "offline", "media-unavailable"])
    .optional(),
})

const parsed = envSchema.safeParse(import.meta.env)
if (!parsed.success) {
  throw new Error(
    `Biến môi trường không hợp lệ: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
  )
}

const raw = parsed.data

/** Bật mock: chỉ ở dev; cờ `false` tắt hẳn (khi backend đã chạy local). */
const enableMocks = import.meta.env.DEV && raw.VITE_ENABLE_MOCKS !== "false"

/** Tự đăng nhập user giả ở dev (mock phải bật); cờ `false` tắt để test 401. */
const devBypassAuth = enableMocks && raw.VITE_DEV_BYPASS_AUTH !== "false"

export const env = {
  apiBaseUrl: raw.VITE_API_BASE_URL,
  enableMocks,
  devBypassAuth,
  /** Kịch bản lỗi của mock server — chỉ có ý nghĩa khi `enableMocks`. */
  mockScenario: raw.VITE_MOCK_SCENARIO ?? "ok",
} as const
