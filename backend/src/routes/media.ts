import { Hono } from "hono"
import { z } from "zod"
import { MAX_MEDIA_FILE_SIZE } from "@rendez/schema"
import type { AppEnv } from "../app"
import { ApiError } from "../lib/errors"
import { env } from "../env"
import { logger } from "../lib/logger"
import {
  contentTypeForFilename,
  isLocalMediaFallbackEnabled,
  readLocalMedia,
  saveLocalMedia,
  signLocalUploadUrl,
  verifyLocalUploadSignature,
} from "../lib/media-storage"
import { rateLimit } from "../lib/rate-limit"
import { buildObjectKey, extensionForContentType, presignPut } from "../lib/r2"
import { requireAuth } from "../lib/session"

const FOLDERS = ["posts", "places", "avatars", "covers"] as const
const FOLDER_SET = new Set<string>(FOLDERS)
const SAFE_FILENAME_RE = /^[0-9a-f-]{8,64}\.(jpg|jpeg|png|webp|avif)$/i
const SAFE_USER_ID_RE = /^[0-9a-f-]{8,64}$/i

const mediaInputSchema = z.object({
  folder: z.enum(FOLDERS),
  contentType: z.string().min(1),
  contentLength: z
    .number()
    .int()
    .positive()
    .max(MAX_MEDIA_FILE_SIZE, "Kích thước ảnh tối đa 5MB")
    .optional(),
  size: z
    .number()
    .int()
    .positive()
    .max(MAX_MEDIA_FILE_SIZE, "Kích thước ảnh tối đa 5MB")
    .optional(),
})

const UPLOAD_TTL_SECONDS = 600

export function createMediaRouter() {
  const router = new Hono<AppEnv>()

  router.post(
    "/media",
    requireAuth,
    // Nâng lên 60 URL/giờ/USER: đủ thoải mái khi đăng bài/demo liên tục mà vẫn chặn bot spam.
    rateLimit({ scope: "media", limit: 60, windowSeconds: 3600, byUser: true }),
    async (c) => {
      const localFallback = isLocalMediaFallbackEnabled()
      if (!env.r2Configured && !localFallback) {
        throw new ApiError(503, "Tính năng upload ảnh chưa được cấu hình")
      }

      const raw = await c.req.json().catch(() => null)
      const parsed = mediaInputSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
      }

      const contentLength = parsed.data.contentLength ?? parsed.data.size
      if (contentLength !== undefined && contentLength > MAX_MEDIA_FILE_SIZE) {
        throw new ApiError(400, "Kích thước ảnh tối đa 5MB")
      }

      const extension = extensionForContentType(parsed.data.contentType)
      if (!extension) {
        throw new ApiError(400, "Chỉ nhận ảnh JPEG, PNG, WebP hoặc AVIF")
      }

      const userId = c.get("userId")
      const key = buildObjectKey(parsed.data.folder, userId, extension)
      const localTicket = signLocalUploadUrl({
        key,
        contentType: parsed.data.contentType,
        expiresInSeconds: UPLOAD_TTL_SECONDS,
      })

      if (env.r2Configured) {
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
            contentLength,
          },
        )

        return c.json(
          {
            uploadUrl: presigned.url,
            publicUrl: presigned.publicUrl,
            ...(localFallback
              ? {
                  fallbackUploadUrl: localTicket.uploadUrl,
                  fallbackPublicUrl: localTicket.publicUrl,
                }
              : {}),
            key: presigned.key,
            expiresAt: presigned.expiresAt,
            headers: presigned.headers,
          },
          201,
        )
      }

      // R2 chưa cấu hình → dùng thẳng kho lưu trữ local làm primary (trong suốt với client).
      logger.warn({ userId, key }, "R2 chưa cấu hình — dùng local media fallback storage")
      return c.json(
        {
          uploadUrl: localTicket.uploadUrl,
          publicUrl: localTicket.publicUrl,
          fallbackUploadUrl: localTicket.uploadUrl,
          fallbackPublicUrl: localTicket.publicUrl,
          key,
          expiresAt: localTicket.expiresAt,
          headers: {
            "Content-Type": parsed.data.contentType,
            ...(contentLength !== undefined ? { "Content-Length": String(contentLength) } : {}),
          },
        },
        201,
      )
    },
  )

  /** Endpoint upload nội bộ dùng khi R2 chưa cấu hình hoặc client failover từ R2. */
  router.put("/media/upload/:folder/:userId/:filename", async (c) => {
    const folder = c.req.param("folder")
    const userId = c.req.param("userId")
    const filename = c.req.param("filename")
    if (
      !FOLDER_SET.has(folder) ||
      !SAFE_USER_ID_RE.test(userId) ||
      !SAFE_FILENAME_RE.test(filename)
    ) {
      throw new ApiError(400, "Đường dẫn tải ảnh không hợp lệ")
    }

    const key = `${folder}/${userId}/${filename}`
    const contentType = c.req.query("contentType") ?? ""
    const expires = c.req.query("expires")
    const sig = c.req.query("sig")

    if (!verifyLocalUploadSignature({ key, contentType, expires, sig })) {
      throw new ApiError(403, "Liên kết tải ảnh không hợp lệ hoặc đã hết hạn")
    }

    const headerType = c.req.header("content-type")?.split(";")[0]?.trim()
    if (!headerType || headerType !== contentType || !extensionForContentType(headerType)) {
      throw new ApiError(400, "Định dạng ảnh không khớp")
    }

    const buf = await c.req.arrayBuffer()
    if (buf.byteLength === 0 || buf.byteLength > MAX_MEDIA_FILE_SIZE) {
      throw new ApiError(400, "Kích thước ảnh phải từ 1 byte đến 5MB")
    }

    await saveLocalMedia(key, new Uint8Array(buf))
    return c.json({ ok: true, key }, 200)
  })

  /** Phục vụ ảnh đã upload lên local storage với Cache-Control dài hạn. */
  router.get("/media/files/:folder/:userId/:filename", async (c) => {
    const folder = c.req.param("folder")
    const userId = c.req.param("userId")
    const filename = c.req.param("filename")
    if (
      !FOLDER_SET.has(folder) ||
      !SAFE_USER_ID_RE.test(userId) ||
      !SAFE_FILENAME_RE.test(filename)
    ) {
      throw new ApiError(404, "Không tìm thấy ảnh")
    }

    const key = `${folder}/${userId}/${filename}`
    const bytes = await readLocalMedia(key)
    if (!bytes) {
      throw new ApiError(404, "Không tìm thấy ảnh")
    }

    const body = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentTypeForFilename(filename),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    })
  })

  return router
}
