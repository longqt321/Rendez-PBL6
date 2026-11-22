import {
  ConsecutiveBreaker,
  TimeoutStrategy,
  circuitBreaker,
  handleAll,
  timeout,
  wrap,
} from "cockatiel"
import escapeHtml from "escape-html"
import nodemailer, { type Transporter } from "nodemailer"
import { env } from "../env"

let transporter: Transporter | null = null

const mailerPolicy = wrap(
  circuitBreaker(handleAll, {
    halfOpenAfter: 60_000,
    breaker: new ConsecutiveBreaker(2),
  }),
  timeout(4_000, TimeoutStrategy.Aggressive),
)

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      // 465/2465 là SMTPS (SSL ngay từ byte đầu); 25/587/2587 dùng STARTTLS.
      secure: env.SMTP_PORT === 465 || env.SMTP_PORT === 2465,
      connectionTimeout: 3_500,
      socketTimeout: 4_000,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    })
  }
  return transporter
}

async function sendResilientMail(
  message: Parameters<Transporter["sendMail"]>[0],
): Promise<boolean> {
  if (!env.mailConfigured) return false
  await mailerPolicy.execute(() => getTransporter().sendMail(message))
  return true
}

export const RESET_PASSWORD_SUBJECT = "Đặt lại mật khẩu Rendez"
export const VERIFY_EMAIL_SUBJECT = "Xác thực email Rendez"
export const ACCOUNT_EXISTS_SUBJECT = "Tài khoản Rendez của bạn đã tồn tại"

export interface ResetPasswordMailInput {
  to: string

  url: string

  name?: string
}

export function buildResetPasswordMail(input: ResetPasswordMailInput) {
  const greeting = input.name?.trim() ? `Chào ${input.name.trim()},` : "Chào bạn,"
  const safeName = escapeHtml(input.name?.trim() || "bạn")
  const safeUrl = escapeHtml(input.url)

  const text = [
    greeting,
    "",
    "Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản Rendez gắn với email này.",
    "Mở link dưới đây để đặt mật khẩu mới (hết hạn sau 1 giờ):",
    "",
    input.url,
    "",
    "Nếu không phải bạn yêu cầu, hãy bỏ qua email này — mật khẩu hiện tại vẫn giữ nguyên.",
  ].join("\n")

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
      <h2 style="margin:0 0 16px;font-size:20px">Đặt lại mật khẩu Rendez</h2>
      <p style="margin:0 0 12px">Chào ${safeName},</p>
      <p style="margin:0 0 12px">
        Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản Rendez gắn với email này.
        Bấm nút bên dưới để đặt mật khẩu mới — link hết hạn sau <strong>1 giờ</strong>.
      </p>
      <p style="margin:20px 0">
        <a href="${safeUrl}"
           style="display:inline-block;background:#e07a5f;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600">
          Đặt mật khẩu mới
        </a>
      </p>
      <p style="margin:0 0 12px;font-size:13px;color:#6b7280">
        Nếu nút không bấm được, copy link này vào trình duyệt:<br />
        <a href="${safeUrl}" style="color:#e07a5f;word-break:break-all">${safeUrl}</a>
      </p>
      <p style="margin:16px 0 0;font-size:13px;color:#6b7280">
        Nếu không phải bạn yêu cầu, hãy bỏ qua email này — mật khẩu hiện tại vẫn giữ nguyên.
      </p>
    </div>
  `.trim()

  return {
    from: env.MAIL_FROM,
    to: input.to,
    subject: RESET_PASSWORD_SUBJECT,
    text,
    html,
  }
}

/**
 * Gửi mail đặt lại mật khẩu. Trả `false` khi chưa cấu hình SMTP (nơi gọi tự
 * fallback); lỗi mạng/SMTP thì ném ra để nơi gọi log và phản hồi trung tính.
 */
export async function sendResetPasswordEmail(input: ResetPasswordMailInput): Promise<boolean> {
  return sendResilientMail(buildResetPasswordMail(input))
}

export interface VerifyEmailMailInput {
  to: string
  /** Link xác thực do better-auth sinh (đã gồm token). */
  url: string
  name?: string
}

/**
 * Dựng nội dung mail xác thực email — cùng pattern với mail reset mật khẩu:
 * tách khỏi phần gửi để test nội dung mà không cần SMTP thật.
 */
export function buildVerifyEmailMail(input: VerifyEmailMailInput) {
  const greeting = input.name?.trim() ? `Chào ${input.name.trim()},` : "Chào bạn,"
  const safeName = escapeHtml(input.name?.trim() || "bạn")
  const safeUrl = escapeHtml(input.url)

  const text = [
    greeting,
    "",
    "Cảm ơn bạn đã tạo tài khoản Rendez. Hãy mở link dưới đây để xác thực email",
    "(link hết hạn sau 1 giờ):",
    "",
    input.url,
    "",
    "Nếu không phải bạn đăng ký, hãy bỏ qua email này.",
  ].join("\n")

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
      <h2 style="margin:0 0 16px;font-size:20px">Xác thực email Rendez</h2>
      <p style="margin:0 0 12px">Chào ${safeName},</p>
      <p style="margin:0 0 12px">
        Cảm ơn bạn đã tạo tài khoản Rendez. Bấm nút bên dưới để xác thực email —
        link hết hạn sau <strong>1 giờ</strong>.
      </p>
      <p style="margin:20px 0">
        <a href="${safeUrl}"
           style="display:inline-block;background:#e07a5f;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600">
          Xác thực email
        </a>
      </p>
      <p style="margin:0 0 12px;font-size:13px;color:#6b7280">
        Nếu nút không bấm được, copy link này vào trình duyệt:<br />
        <a href="${safeUrl}" style="color:#e07a5f;word-break:break-all">${safeUrl}</a>
      </p>
      <p style="margin:16px 0 0;font-size:13px;color:#6b7280">
        Nếu không phải bạn đăng ký, hãy bỏ qua email này.
      </p>
    </div>
  `.trim()

  return {
    from: env.MAIL_FROM,
    to: input.to,
    subject: VERIFY_EMAIL_SUBJECT,
    text,
    html,
  }
}

/** Gửi mail xác thực email — hành vi trả về giống `sendResetPasswordEmail`. */
export async function sendVerifyEmailEmail(input: VerifyEmailMailInput): Promise<boolean> {
  return sendResilientMail(buildVerifyEmailMail(input))
}

export interface AccountExistsMailInput {
  to: string
  /** Tên hiển thị để chào — thiếu thì chào trung tính. */
  name?: string
  /** Trang đăng nhập của FE (không kèm token). */
  loginUrl: string
  /** Trang quên mật khẩu của FE (không kèm token). */
  forgotPasswordUrl: string
}

/**
 * Dựng mail "tài khoản đã tồn tại" — gửi khi có người đăng ký lại bằng email đã
 * có tài khoản ĐÃ xác thực.
 *
 * Vì sao không gửi link đặt lại mật khẩu kèm token: kẻ xấu có thể nhập email
 * người khác vào form đăng ký để "ép" hệ thống gửi mail đổi mật khẩu. Mail này
 * chỉ chứa link tới trang đăng nhập / quên mật khẩu, người dùng chủ động yêu
 * cầu link khi thật sự cần.
 */
export function buildAccountExistsMail(input: AccountExistsMailInput) {
  const greeting = input.name?.trim() ? `Chào ${input.name.trim()},` : "Chào bạn,"
  const safeName = escapeHtml(input.name?.trim() || "bạn")
  const safeLogin = escapeHtml(input.loginUrl)
  const safeForgot = escapeHtml(input.forgotPasswordUrl)

  const text = [
    greeting,
    "",
    "Ai đó (có thể là bạn) vừa thử tạo tài khoản Rendez bằng email này, nhưng email đã gắn với một tài khoản Rendez đã xác thực.",
    "",
    "Nếu là bạn, hãy đăng nhập tại:",
    input.loginUrl,
    "",
    "Quên mật khẩu? Yêu cầu link mới tại:",
    input.forgotPasswordUrl,
    "",
    "Nếu không phải bạn, hãy bỏ qua email này — tài khoản hiện tại không bị thay đổi.",
  ].join("\n")

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
      <h2 style="margin:0 0 16px;font-size:20px">Tài khoản Rendez đã tồn tại</h2>
      <p style="margin:0 0 12px">Chào ${safeName},</p>
      <p style="margin:0 0 12px">
        Ai đó (có thể là bạn) vừa thử tạo tài khoản Rendez bằng email này, nhưng email
        đã gắn với một tài khoản Rendez <strong>đã xác thực</strong>.
      </p>
      <p style="margin:20px 0">
        <a href="${safeLogin}"
           style="display:inline-block;background:#e07a5f;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600">
          Đăng nhập Rendez
        </a>
      </p>
      <p style="margin:0 0 12px;font-size:13px;color:#6b7280">
        Quên mật khẩu? <a href="${safeForgot}" style="color:#e07a5f">Yêu cầu link đặt lại mật khẩu</a>.
      </p>
      <p style="margin:16px 0 0;font-size:13px;color:#6b7280">
        Nếu không phải bạn, hãy bỏ qua email này — tài khoản hiện tại không bị thay đổi.
      </p>
    </div>
  `.trim()

  return {
    from: env.MAIL_FROM,
    to: input.to,
    subject: ACCOUNT_EXISTS_SUBJECT,
    text,
    html,
  }
}

/** Gửi mail "tài khoản đã tồn tại" — hành vi trả về giống mail xác thực. */
export async function sendAccountExistsEmail(input: AccountExistsMailInput): Promise<boolean> {
  return sendResilientMail(buildAccountExistsMail(input))
}
