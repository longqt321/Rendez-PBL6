import { describe, expect, test } from "bun:test"
import {
  ACCOUNT_EXISTS_SUBJECT,
  RESET_PASSWORD_SUBJECT,
  VERIFY_EMAIL_SUBJECT,
  buildAccountExistsMail,
  buildResetPasswordMail,
  buildVerifyEmailMail,
} from "../src/lib/mailer"

/**
 * Nội dung mail reset mật khẩu phải đúng và phải escape HTML — tên người dùng
 * đến từ input của người dùng, đưa thẳng vào HTML là lỗ hổng XSS trong mail.
 * Phần gửi thật (SMTP) phụ thuộc môi trường nên không test ở đây.
 */
describe("buildResetPasswordMail", () => {
  test("đủ from/to/subject/text/html, chứa link reset", () => {
    const mail = buildResetPasswordMail({
      to: "user@example.com",
      url: "https://rendez.example.com/reset-password?token=abc",
      name: "Minh Anh",
    })
    expect(mail.to).toBe("user@example.com")
    expect(mail.subject).toBe(RESET_PASSWORD_SUBJECT)
    // `from` lấy từ env MAIL_FROM — môi trường test không đặt nên chỉ kiểm kiểu.
    expect(typeof mail.from).toBe("string")
    expect(mail.text).toContain("https://rendez.example.com/reset-password?token=abc")
    expect(mail.html).toContain("https://rendez.example.com/reset-password?token=abc")
    expect(mail.html).toContain("Chào Minh Anh")
  })

  test("thiếu tên thì chào trung tính", () => {
    const mail = buildResetPasswordMail({
      to: "user@example.com",
      url: "https://rendez.example.com/reset?token=abc",
    })
    expect(mail.html).toContain("Chào bạn")
    expect(mail.html).not.toContain("Chào undefined")
  })

  test("escape HTML trong tên người dùng", () => {
    const mail = buildResetPasswordMail({
      to: "user@example.com",
      url: "https://rendez.example.com/reset?token=abc",
      name: '<script>alert("x")</script>',
    })
    expect(mail.html).not.toContain("<script>")
    expect(mail.html).toContain("&lt;script&gt;")
  })
})

describe("buildVerifyEmailMail", () => {
  test("đủ from/to/subject/text/html, chứa link xác thực", () => {
    const mail = buildVerifyEmailMail({
      to: "user@example.com",
      url: "http://localhost:8000/api/v1/auth/verify-email?token=abc&callbackURL=%2Fverify-email",
      name: "Minh Anh",
    })
    expect(mail.to).toBe("user@example.com")
    expect(mail.subject).toBe(VERIFY_EMAIL_SUBJECT)
    expect(typeof mail.from).toBe("string")
    expect(mail.text).toContain("verify-email?token=abc")
    expect(mail.html).toContain("verify-email?token=abc")
    expect(mail.html).toContain("Chào Minh Anh")
  })

  test("thiếu tên thì chào trung tính", () => {
    const mail = buildVerifyEmailMail({ to: "user@example.com", url: "https://x.test/v?token=a" })
    expect(mail.html).toContain("Chào bạn")
    expect(mail.html).not.toContain("Chào undefined")
  })

  test("escape HTML trong tên người dùng", () => {
    const mail = buildVerifyEmailMail({
      to: "user@example.com",
      url: "https://x.test/v?token=a",
      name: '<img src=x onerror="alert(1)">',
    })
    expect(mail.html).not.toContain("<img")
    expect(mail.html).toContain("&lt;img")
  })
})

describe("buildAccountExistsMail", () => {
  test("đủ from/to/subject/text/html, chứa link đăng nhập và quên mật khẩu, không có token", () => {
    const mail = buildAccountExistsMail({
      to: "user@example.com",
      name: "Minh Anh",
      loginUrl: "http://localhost:5173/login",
      forgotPasswordUrl: "http://localhost:5173/forgot-password",
    })
    expect(mail.to).toBe("user@example.com")
    expect(mail.subject).toBe(ACCOUNT_EXISTS_SUBJECT)
    expect(typeof mail.from).toBe("string")
    expect(mail.text).toContain("http://localhost:5173/login")
    expect(mail.html).toContain("http://localhost:5173/login")
    expect(mail.html).toContain("http://localhost:5173/forgot-password")
    // Mail này không được kèm token nào (chống lạm dụng ép gửi link đổi mật khẩu).
    expect(mail.text).not.toMatch(/token=/u)
    expect(mail.html).not.toMatch(/token=/u)
    expect(mail.html).toContain("Chào Minh Anh")
  })

  test("escape HTML trong tên người dùng", () => {
    const mail = buildAccountExistsMail({
      to: "user@example.com",
      name: '<script>alert("x")</script>',
      loginUrl: "http://localhost:5173/login",
      forgotPasswordUrl: "http://localhost:5173/forgot-password",
    })
    expect(mail.html).not.toContain("<script>")
    expect(mail.html).toContain("&lt;script&gt;")
  })
})
