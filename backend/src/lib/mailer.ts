import nodemailer, { type Transporter } from "nodemailer"
import { env } from "../env"

/**
 * Gửi mail giao dịch qua SMTP chuẩn (nodemailer).
 *
 * Vì sao SMTP chứ không phải SDK riêng của nhà cung cấp: cùng một cấu hình chạy
 * được với Resend / Brevo / SES / Gmail — đổi nhà cung cấp chỉ đổi biến môi
 * trường, không sửa code. Hướng dẫn cấu hình: docs/backend/SMTP-SETUP.md.
 *
 * Thiếu cấu hình (`env.mailConfigured === false`) thì `sendResetPasswordEmail`
 * trả `false` — nơi gọi tự quyết định fallback (dev log token, production ghi
 * nhận). Không ném lỗi lúc import để môi trường dev không có SMTP vẫn chạy.
 */

let transporter: Transporter | null = null

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      // 465/2465 là SMTPS (SSL ngay từ byte đầu); 25/587/2587 dùng STARTTLS.
      secure: env.SMTP_PORT === 465 || env.SMTP_PORT === 2465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    })
  }
  return transporter
}

/** Tiêu đề cố định — test và template cùng đọc một hằng số. */
export const RESET_PASSWORD_SUBJECT = "Đặt lại mật khẩu Rendez"
export const VERIFY_EMAIL_SUBJECT = "Xác thực email Rendez"

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export interface ResetPasswordMailInput {
  to: string
  /** Link đặt lại mật khẩu do better-auth sinh (đã gồm token). */
  url: string
  /** Tên hiển thị để chào — thiếu thì chào trung tính. */
  name?: string
}

/**
 * Dựng nội dung mail đặt lại mật khẩu.
 *
 * Tách khỏi phần gửi để test được nội dung mà không cần SMTP thật.
 */
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
  if (!env.mailConfigured) return false
  await getTransporter().sendMail(buildResetPasswordMail(input))
  return true
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
  if (!env.mailConfigured) return false
  await getTransporter().sendMail(buildVerifyEmailMail(input))
  return true
}
