import axios from "axios"
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
