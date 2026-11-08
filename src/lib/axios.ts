import axios from "axios"
import { env } from "@/lib/env"

/**
 * Lỗi API đã chuẩn hoá — UI chỉ cần đọc `message`/`status`.
 *
 * Khi backend thật trả `{ message, code }` (xem hợp đồng D-011) interceptor bên
 * dưới bọc lại thành `ApiError`; lỗi mạng (timeout, mất kết nối) có `status = 0`.
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
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 0
      const body = error.response?.data as { message?: unknown; code?: unknown } | undefined
      const message =
        typeof body?.message === "string" && body.message.length > 0
          ? body.message
          : status === 0
            ? "Không kết nối được máy chủ — kiểm tra mạng rồi thử lại."
            : "Máy chủ trả lỗi — thử lại sau."
      const code = typeof body?.code === "string" ? body.code : undefined
      return Promise.reject(new ApiError(message, status, code))
    }
    return Promise.reject(error instanceof Error ? error : new Error("Lỗi không xác định"))
  },
)
