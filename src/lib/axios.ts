import axios from "axios"
import { checkApiContract } from "@/lib/api-contracts"
import { env } from "@/lib/env"

/**
 * Lỗi API đã chuẩn hoá — UI chỉ cần đọc `message`/`status`.
 *
 * Backend trả `{ message }` hoặc `{ detail }` (FastAPI) đều được nhận; lỗi mạng
 * (timeout, mất kết nối) có `status = 0`.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

/**
 * Lỗi 404 từ server — tài nguyên không tồn tại (khác lỗi mạng/5xx, nơi thử lại
 * có ích). Trang chi tiết dùng để chọn "không tìm thấy" hay "không tải được".
 */
export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

/**
 * Chuyển mọi lỗi axios thành `ApiError` (hoặc giữ nguyên `Error` khác).
 * Tách khỏi interceptor để test được mà không cần gọi mạng.
 */
export function toApiError(error: unknown): Error {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error : new Error("Lỗi không xác định")
  }

  const status = error.response?.status ?? 0
  const body = error.response?.data as
    { message?: unknown; detail?: unknown; code?: unknown } | undefined
  const serverMessage = [body?.message, body?.detail].find(
    (value): value is string => typeof value === "string" && value.length > 0,
  )
  const message =
    serverMessage ??
    (status === 0
      ? "Không kết nối được máy chủ — kiểm tra mạng rồi thử lại."
      : "Máy chủ trả lỗi — thử lại sau.")
  const code = typeof body?.code === "string" ? body.code : undefined
  return new ApiError(message, status, code)
}

/**
 * Adapter mock chỉ nạp ở dev (`VITE_ENABLE_MOCKS !== "false"`). Điều kiện dùng
 * `import.meta.env.DEV` trực tiếp để Vite loại `src/mocks/` khỏi bundle production.
 */
const mockAdapter =
  import.meta.env.DEV && env.enableMocks ? (await import("@/mocks/server")).mockAdapter : undefined

export const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10_000,
  adapter: mockAdapter,
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
)

/**
 * Contract test response khi mock bật: đối chiếu `response.data` với schema zod
 * của endpoint. Lệch hợp đồng chỉ `console.error` — không throw, không làm vỡ UI.
 * Chỉ đăng ký khi mock bật (dev) để production không chịu chi phí kiểm tra.
 */
if (env.enableMocks) {
  api.interceptors.response.use((response) => {
    const method = (response.config.method ?? "get").toUpperCase()
    const url = response.config.url ?? ""
    const message = checkApiContract(method, url, response.data)
    if (message) {
      console.error(`[API contract] ${method} ${url.split("?")[0]}: ${message}`)
    }
    return response
  })
}
