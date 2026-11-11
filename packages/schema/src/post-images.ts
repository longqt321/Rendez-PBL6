import { MAX_POST_IMAGES } from "./constants"

/**
 * Kiểm URL ảnh của một bài đăng — MỘT nguồn logic cho backend và mock server.
 *
 * Ảnh phải do chính người đăng tải lên thư mục `posts/<userId>/` của bucket:
 * không có ràng buộc này thì ai cũng gắn được URL ảnh của người khác (hoặc URL
 * ngoài) vào bài của mình.
 *
 * Hàm thuần (không phụ thuộc env/HTTP) để cả `routes/posts.ts` (ném `ApiError`)
 * lẫn `mocks/server.ts` (ném lỗi 400 của adapter) cùng gọi — tránh hai bản
 * validate lệch nhau.
 */

/** URL ảnh dài hơn mức này là bất thường (URL công khai R2 luôn ngắn hơn nhiều). */
export const MAX_POST_IMAGE_URL_LENGTH = 2048

export const POST_IMAGE_INVALID_MESSAGE = "Ảnh không hợp lệ hoặc không thuộc tài khoản của bạn"
export const POST_IMAGE_DUPLICATE_MESSAGE = "Ảnh bị trùng trong bài đăng"
export const POST_IMAGE_TOO_MANY_MESSAGE = `Tối đa ${MAX_POST_IMAGES} ảnh mỗi bài đăng`
export const POST_IMAGE_TOO_LONG_MESSAGE = "URL ảnh quá dài"

export interface ValidatePostImageUrlsOptions {
  /** Người đăng — ảnh phải nằm dưới `posts/<userId>/`. */
  userId: string
  /** Domain công khai của bucket (`R2_PUBLIC_BASE_URL`); mock dùng domain giả. */
  publicBaseUrl: string
}

export type PostImageValidation = { ok: true; images: string[] } | { ok: false; message: string }

/**
 * Trả danh sách URL đã kiểm (giữ nguyên thứ tự) hoặc thông điệp lỗi tiếng Việt.
 *
 * `images` rỗng/không truyền là hợp lệ — bài chỉ có chữ.
 */
export function validatePostImageUrls(
  images: readonly string[] | undefined,
  options: ValidatePostImageUrlsOptions,
): PostImageValidation {
  if (!images || images.length === 0) return { ok: true, images: [] }
  if (images.length > MAX_POST_IMAGES) {
    return { ok: false, message: POST_IMAGE_TOO_MANY_MESSAGE }
  }
  if (new Set(images).size !== images.length) {
    return { ok: false, message: POST_IMAGE_DUPLICATE_MESSAGE }
  }

  const base = new URL(options.publicBaseUrl)
  const basePath = base.pathname.replace(/\/$/, "")
  const expectedPrefix = `${basePath}/posts/${options.userId}/`

  for (const url of images) {
    if (url.length > MAX_POST_IMAGE_URL_LENGTH) {
      return { ok: false, message: POST_IMAGE_TOO_LONG_MESSAGE }
    }

    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return { ok: false, message: POST_IMAGE_INVALID_MESSAGE }
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { ok: false, message: POST_IMAGE_INVALID_MESSAGE }
    }
    // So khớp origin + path đã chuẩn hoá (URL tự resolve `..`) — không chỉ
    // startsWith chuỗi thô, tránh `posts/<uid>/../../places/...` lọt qua.
    if (parsed.origin !== base.origin) {
      return { ok: false, message: POST_IMAGE_INVALID_MESSAGE }
    }
    // Userinfo (`user:pass@`), query (`?x=`) hay fragment (`#x`) đều không nằm
    // trong URL công khai R2 trả về — có nghĩa là URL bị chế biến, từ chối.
    if (parsed.username || parsed.password || parsed.search || parsed.hash) {
      return { ok: false, message: POST_IMAGE_INVALID_MESSAGE }
    }
    if (!parsed.pathname.startsWith(expectedPrefix)) {
      return { ok: false, message: POST_IMAGE_INVALID_MESSAGE }
    }
  }

  return { ok: true, images: [...images] }
}
