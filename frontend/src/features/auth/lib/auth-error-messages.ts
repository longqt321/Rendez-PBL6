/**
 * Dịch lỗi better-auth sang tiếng Việt ở tầng UI.
 *
 * Vì sao map ở FE chứ không ở BE: các endpoint `/auth/reset-password`,
 * `/auth/verify-email`… do better-auth tự xử lý (`routes/index.ts` mount
 * `auth.handler`) nên body lỗi là `{ message: "Invalid token", code:
 * "INVALID_TOKEN" }` tiếng Anh. Đây là thông điệp hiển thị cho người dùng cuối
 * nên chỗ đúng để bản địa hoá là UI; route `/session` do backend tự map.
 */

/** Mã lỗi better-auth → câu tiếng Việt (nguồn: `@better-auth/core/error`). */
const MESSAGES_BY_CODE: Readonly<Record<string, string>> = {
  INVALID_TOKEN: "Link không hợp lệ hoặc đã hết hạn. Hãy yêu cầu link mới.",
  TOKEN_EXPIRED: "Link đã hết hạn. Hãy yêu cầu link mới.",
  USER_NOT_FOUND: "Không tìm thấy tài khoản cho link này.",
  INVALID_PASSWORD: "Mật khẩu không hợp lệ.",
  PASSWORD_TOO_SHORT: "Mật khẩu quá ngắn.",
  PASSWORD_TOO_LONG: "Mật khẩu quá dài.",
  EMAIL_NOT_VERIFIED: "Email chưa được xác thực. Hãy mở link trong email xác thực rồi thử lại.",
  INVALID_EMAIL: "Email không hợp lệ.",
  INVALID_EMAIL_OR_PASSWORD: "Email hoặc mật khẩu không đúng.",
}

/**
 * Nhận diện message tiếng Anh thô của better-auth (khi body không kèm `code`).
 * Chỉ khớp các câu đã biết — không đoán bừa để tránh dịch sai lỗi khác.
 */
const MESSAGES_BY_TEXT: ReadonlyArray<{ pattern: RegExp; message: string }> = [
  { pattern: /^invalid token$/i, message: MESSAGES_BY_CODE.INVALID_TOKEN },
  { pattern: /token (has )?expired/i, message: MESSAGES_BY_CODE.TOKEN_EXPIRED },
  { pattern: /^user not found$/i, message: MESSAGES_BY_CODE.USER_NOT_FOUND },
  { pattern: /^invalid password$/i, message: MESSAGES_BY_CODE.INVALID_PASSWORD },
  { pattern: /^email not verified$/i, message: MESSAGES_BY_CODE.EMAIL_NOT_VERIFIED },
  {
    pattern: /^invalid email( or password)?$/i,
    message: MESSAGES_BY_CODE.INVALID_EMAIL_OR_PASSWORD,
  },
]

/**
 * Trả câu tiếng Việt cho lỗi auth; message không nhận diện được giữ nguyên
 * (backend đã trả tiếng Việt cho phần lớn lỗi).
 */
export function mapAuthErrorMessage(error: { message: string; code?: string }): string {
  if (error.code && MESSAGES_BY_CODE[error.code]) return MESSAGES_BY_CODE[error.code]
  const matched = MESSAGES_BY_TEXT.find(({ pattern }) => pattern.test(error.message.trim()))
  return matched?.message ?? error.message
}
