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
  VITE_API_BASE_URL: z.string().min(1).default("/api/v1"),
  /**
   * Bật mock server in-memory (`src/mocks/`). Mock chỉ tồn tại ở dev — build
   * production luôn gọi backend thật. Đặt `VITE_ENABLE_MOCKS=false` để tắt cả ở dev
   * (dùng khi backend đã chạy local).
   */
  VITE_ENABLE_MOCKS: z.enum(["true", "false"]).optional(),
  /**
   * Bỏ qua bước đăng nhập ở dev — mock server tự trả user giả cho `GET /me`.
   * Chỉ có ý nghĩa khi mock bật; đặt `VITE_DEV_BYPASS_AUTH=false` để thấy đúng
   * trạng thái "chưa đăng nhập" khi backend chưa chạy.
   */
  VITE_DEV_BYPASS_AUTH: z.enum(["true", "false"]).optional(),
  /**
   * Kịch bản lỗi của mock server (`src/mocks/scenarios.ts`): `slow` (trễ thêm),
   * `empty` (danh sách rỗng), `server-error` (GET trả 500), `unauthorized`
   * (GET /me trả 401), `offline` (mọi request lỗi mạng), `media-unavailable`
   * (`POST /media` trả 503). Chỉ có ý nghĩa khi mock bật; đổi giá trị cần
   * restart dev server.
   */
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
