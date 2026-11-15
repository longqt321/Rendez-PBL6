import { MAX_POST_IMAGES } from "./constants"

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
 * Kiểm MỘT URL ảnh thuộc thư mục `<folder>/<userId>/` của bucket công khai.
 *
 * Dùng chung cho ảnh bài đăng (`posts/`) và ảnh hồ sơ (`avatars/`, `covers/`) —
 * cùng một quy tắc origin/path/userinfo nên không có bản validate lệch nhau.
 * Trả `null` khi hợp lệ, ngược lại trả thông điệp lỗi.
 */
function checkOwnedMediaUrl(url: string, base: URL, expectedPrefix: string): string | null {
  if (url.length > MAX_POST_IMAGE_URL_LENGTH) {
    return POST_IMAGE_TOO_LONG_MESSAGE
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return POST_IMAGE_INVALID_MESSAGE
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return POST_IMAGE_INVALID_MESSAGE
  }
  // So khớp origin + path đã chuẩn hoá (URL tự resolve `..`) — không chỉ
  // startsWith chuỗi thô, tránh `posts/<uid>/../../places/...` lọt qua.
  if (parsed.origin !== base.origin) {
    return POST_IMAGE_INVALID_MESSAGE
  }
  // Userinfo (`user:pass@`), query (`?x=`) hay fragment (`#x`) đều không nằm
  // trong URL công khai R2 trả về — có nghĩa là URL bị chế biến, từ chối.
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    return POST_IMAGE_INVALID_MESSAGE
  }
  if (!parsed.pathname.startsWith(expectedPrefix)) {
    return POST_IMAGE_INVALID_MESSAGE
  }
  return null
}

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
    const error = checkOwnedMediaUrl(url, base, expectedPrefix)
    if (error) return { ok: false, message: error }
  }

  return { ok: true, images: [...images] }
}

/** Thư mục ảnh hồ sơ — khớp whitelist `folder` của `POST /media`. */
export type ProfileMediaFolder = "avatars" | "covers"

export interface ValidateProfileImageUrlOptions {
  /** Chủ hồ sơ — ảnh phải nằm dưới `<folder>/<userId>/`. */
  userId: string
  /** `avatars` cho ảnh đại diện, `covers` cho ảnh bìa. */
  folder: ProfileMediaFolder
  /** Domain công khai của bucket (`R2_PUBLIC_BASE_URL`); mock dùng domain giả. */
  publicBaseUrl: string
}

export type ProfileImageValidation = { ok: true } | { ok: false; message: string }

/**
 * Kiểm URL ảnh đại diện/ảnh bìa trước khi ghi vào hồ sơ.
 *
 * `null`/`undefined`/chuỗi rỗng = xoá ảnh, hợp lệ. Cùng quy tắc với ảnh bài
 * đăng: URL phải do chính người dùng tải lên thư mục của họ, nếu không ai cũng
 * gắn được ảnh của người khác (hoặc URL ngoài) vào hồ sơ mình.
 */
export function validateProfileImageUrl(
  url: string | null | undefined,
  options: ValidateProfileImageUrlOptions,
): ProfileImageValidation {
  if (url == null || url === "") return { ok: true }

  const base = new URL(options.publicBaseUrl)
  const basePath = base.pathname.replace(/\/$/, "")
  const expectedPrefix = `${basePath}/${options.folder}/${options.userId}/`

  const error = checkOwnedMediaUrl(url, base, expectedPrefix)
  return error ? { ok: false, message: error } : { ok: true }
}
