import { z } from "zod"

/**
 * Biến môi trường của frontend — đọc MỘT chỗ duy nhất.
 *
 * Component/hook không được gọi `import.meta.env` trực tiếp: mọi giá trị đi qua
 * đây để validate bằng zod ngay lúc khởi động (lỗi cấu hình lộ ra khi bật app,
 * không âm thầm trỏ sai backend).
 */
const envSchema = z.object({
  /**
   * Base URL của backend API. Mặc định `/api` — dùng proxy dev của Vite nên
   * không vướng CORS; đặt URL tuyệt đối khi backend ở origin khác.
   */
  VITE_API_BASE_URL: z.string().min(1).default("/api"),
  /**
   * Bật mock server in-memory (`src/mocks/`). Mock chỉ tồn tại ở dev — build
   * production luôn gọi backend thật. Đặt `VITE_ENABLE_MOCKS=false` để tắt cả ở dev
   * (dùng khi backend đã chạy local).
   */
  VITE_ENABLE_MOCKS: z.enum(["true", "false"]).optional(),
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

export const env = {
  apiBaseUrl: raw.VITE_API_BASE_URL,
  enableMocks,
} as const
