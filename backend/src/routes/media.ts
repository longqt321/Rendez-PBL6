import { Hono } from "hono"
import { z } from "zod"
import type { AppEnv } from "../app"
import { ApiError } from "../lib/errors"
import { env } from "../env"
import { rateLimit } from "../lib/rate-limit"
import { buildObjectKey, extensionForContentType, presignPut } from "../lib/r2"
import { requireAuth } from "../lib/session"

/**
 * Upload ảnh (T7.1) — API không nhận file: trả URL PUT đã ký để client tải thẳng
 * lên R2 (H5: ảnh đi qua presigned nên body limit không áp dụng cho ảnh).
 *
 * Chỉ 2 thư mục hợp lệ; contentType phải là ảnh — chặn client đẩy HTML/SVG lên
 * bucket công khai. Khoá object do server sinh, không dùng tên client gửi.
 */

const FOLDERS = ["posts", "places"] as const

const mediaInputSchema = z.object({
  folder: z.enum(FOLDERS),
  contentType: z.string().min(1),
})

/** Presigned PUT sống 10 phút — đủ tải ảnh 3G, ngắn để giảm lạm dụng. */
const UPLOAD_TTL_SECONDS = 600

export function createMediaRouter() {
  const router = new Hono<AppEnv>()

  router.post(
    "/media",
    requireAuth,
    rateLimit({ scope: "media", limit: 10, windowSeconds: 3600 }),
    async (c) => {
      if (!env.r2Configured) {
        throw new ApiError(503, "Tính năng upload ảnh chưa được cấu hình")
      }

      const raw = await c.req.json().catch(() => null)
      const parsed = mediaInputSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
      }

      const extension = extensionForContentType(parsed.data.contentType)
      if (!extension) {
        throw new ApiError(400, "Chỉ nhận ảnh JPEG, PNG, WebP hoặc AVIF")
      }

      const userId = c.get("userId")
      const key = buildObjectKey(parsed.data.folder, userId, extension)
      const presigned = presignPut(
        {
          accountId: env.R2_ACCOUNT_ID,
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          bucket: env.R2_BUCKET,
          publicBaseUrl: env.R2_PUBLIC_BASE_URL,
        },
        {
          key,
          expiresInSeconds: UPLOAD_TTL_SECONDS,
          contentType: parsed.data.contentType,
        },
      )

      return c.json(
        {
          uploadUrl: presigned.url,
          publicUrl: presigned.publicUrl,
          key: presigned.key,
          expiresAt: presigned.expiresAt,
          headers: presigned.headers,
        },
        201,
      )
    },
  )

  return router
}
