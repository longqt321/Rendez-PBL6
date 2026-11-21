import { z } from "zod"

function emptyToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value
}

export const envSchema = z.object({
  VITE_API_BASE_URL: z.preprocess(emptyToUndefined, z.string().min(1).default("/api/v1")),

  VITE_ENABLE_MOCKS: z.preprocess(emptyToUndefined, z.enum(["true", "false"]).optional()),

  VITE_DEV_BYPASS_AUTH: z.preprocess(emptyToUndefined, z.enum(["true", "false"]).optional()),

  VITE_MOCK_SCENARIO: z.preprocess(
    emptyToUndefined,
    z
      .enum(["ok", "slow", "empty", "server-error", "unauthorized", "offline", "media-unavailable"])
      .optional(),
  ),
})

const parsed = envSchema.safeParse(import.meta.env)
if (!parsed.success) {
  throw new Error(
    `Biến môi trường không hợp lệ: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
  )
}

const raw = parsed.data

/**
 * Kết nối trực tiếp Backend thật khi dev & production; chỉ bật mock in-memory
 * trong môi trường test (vitest), E2E mock, hoặc khi truyền `VITE_ENABLE_MOCKS=true` (`bun run dev:mock`).
 */
const isTestMode = import.meta.env.MODE === "test"
const enableMocks =
  raw.VITE_ENABLE_MOCKS === "true" || (isTestMode && raw.VITE_ENABLE_MOCKS !== "false")

/** Tự đăng nhập user giả ở dev (mock phải bật); cờ `false` tắt để test 401. */
const devBypassAuth = enableMocks && raw.VITE_DEV_BYPASS_AUTH !== "false"

export const env = {
  apiBaseUrl: raw.VITE_API_BASE_URL,
  enableMocks,
  devBypassAuth,
  /** Kịch bản lỗi của mock server — chỉ có ý nghĩa khi `enableMocks`. */
  mockScenario: raw.VITE_MOCK_SCENARIO ?? "ok",
} as const
