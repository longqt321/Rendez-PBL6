import { HTTPException } from "hono/http-exception"
import type { ContentfulStatusCode } from "hono/utils/http-status"

/**
 * Lỗi nghiệp vụ có chủ đích — luôn trả JSON `{ message }` (quyết định D6).
 *
 * `HTTPException` với `message` thuần trả TEXT (đã xác minh docs hono.dev) —
 * muốn JSON phải truyền `res` dựng sẵn. Class này bọc lại để các route chỉ
 * `throw new ApiError(404, "Không tìm thấy bài đăng")`.
 */
export class ApiError extends HTTPException {
  constructor(status: ContentfulStatusCode, message: string, code?: string) {
    super(status, {
      res: new Response(JSON.stringify({ message, ...(code && { code }) }), {
        status,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }),
    })
  }
}

/**
 * Postgres từ chối ký tự NUL (`\u0000`) trong text — SQLSTATE `22021`
 * "invalid byte sequence for encoding UTF8: 0x00". Prisma bọc lỗi này thành
 * `PrismaClientKnownRequestError` code `P2010` với mã gốc nằm trong
 * `meta.driverAdapterError.cause.originalCode`.
 *
 * Đây là lỗi ĐẦU VÀO (query string hoặc body chứa NUL), không phải lỗi hệ
 * thống, nên `onError` map về 400 thay vì 500 — một chỗ xử lý cho mọi route.
 */
export function isNulByteError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false
  const meta = (error as { meta?: unknown }).meta
  if (typeof meta !== "object" || meta === null) return false
  const adapter = (meta as { driverAdapterError?: unknown }).driverAdapterError
  if (typeof adapter !== "object" || adapter === null) return false
  const cause = (adapter as { cause?: unknown }).cause
  if (typeof cause !== "object" || cause === null) return false
  return (cause as { originalCode?: unknown }).originalCode === "22021"
}
