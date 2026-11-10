import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

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
    });
  }
}
