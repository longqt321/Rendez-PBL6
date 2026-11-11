import { expect, test } from "@playwright/test"
import { e2eAccount } from "./credentials.js"

/**
 * Vòng đời tài khoản (G1): đăng nhập, đăng ký, quên mật khẩu.
 *
 * Tài khoản đăng nhập lấy từ `e2eAccount()`: mock dùng tài khoản dev
 * `me@rendez.test` / `password123` (xem `src/mocks/server.ts`); project backend
 * dùng tài khoản demo do global-setup tạo qua API thật.
 */
test.describe.configure({ mode: "serial" })

test("đăng nhập sai mật khẩu hiện lỗi, đúng mật khẩu về trang khám phá", async ({ page }) => {
  const account = e2eAccount()
  await page.goto("/login")

  await page.getByLabel("Email").fill(account.email)
  await page.getByLabel("Mật khẩu", { exact: true }).fill("sai-mat-khau")
  await page.getByRole("button", { name: "Đăng nhập" }).click()
  await expect(page.getByText("Email hoặc mật khẩu không đúng")).toBeVisible()

  await page.getByLabel("Mật khẩu", { exact: true }).fill(account.password)
  await page.getByRole("button", { name: "Đăng nhập" }).click()
  await expect(page).toHaveURL(/\/discover$/u)
})

test("đăng ký tài khoản mới → hiện màn hình kiểm tra email (không vào app)", async ({ page }) => {
  const handle = `e2e_${Date.now().toString(36).slice(-6)}`
  await page.goto("/register")

  await page.getByLabel("Tên hiển thị").fill("E2E Tester")
  await page.getByLabel("Email").fill(`${handle}@rendez.test`)
  await page.getByLabel("Tên người dùng").fill(handle)
  await page.getByLabel("Mật khẩu", { exact: true }).fill("password123")
  await page.getByLabel("Nhập lại mật khẩu").fill("password123")
  await page.getByRole("button", { name: "Đăng ký" }).click()

  // Bắt buộc xác thực email (2026-11-12): đăng ký xong KHÔNG có phiên.
  await expect(page.getByText("Kiểm tra email của bạn")).toBeVisible()
  await expect(
    page.getByText(`Chúng tôi đã gửi link xác thực tới ${handle}@rendez.test`),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Gửi lại email xác thực" })).toBeVisible()
})

test("chưa xác thực email không đăng nhập được; gửi lại mail xong đăng nhập được", async ({
  page,
}) => {
  // Backend thật: không bấm được link trong hộp thư từ e2e — luồng xác thực
  // (token thật, autoSignIn) được phủ ở backend test `test/auth.test.ts`.
  // Mock: "gửi lại email" được server mock coi như người dùng đã bấm link.
  test.skip(!!process.env.E2E_BACKEND_URL, "Chỉ chạy project mock")
  const handle = `e2e_${Date.now().toString(36).slice(-6)}`
  const email = `${handle}@rendez.test`

  await page.goto("/register")
  await page.getByLabel("Tên hiển thị").fill("E2E Tester")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Tên người dùng").fill(handle)
  await page.getByLabel("Mật khẩu", { exact: true }).fill("password123")
  await page.getByLabel("Nhập lại mật khẩu").fill("password123")
  await page.getByRole("button", { name: "Đăng ký" }).click()
  await expect(page.getByText("Kiểm tra email của bạn")).toBeVisible()

  // Mock là bộ nhớ trong trang: phải điều hướng SPA (link trong trang), không
  // `goto` — tải lại trang là mock reset, tài khoản vừa đăng ký biến mất.
  await page.getByRole("link", { name: "Đăng nhập" }).click()
  await expect(page).toHaveURL(/\/login$/u)
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Mật khẩu", { exact: true }).fill("password123")
  await page.getByRole("button", { name: "Đăng nhập" }).click()
  await expect(page.getByText(/chưa được xác thực/i)).toBeVisible()

  await page.getByRole("button", { name: "Gửi lại email xác thực" }).click()
  await expect(page.getByText("Đã gửi lại email xác thực")).toBeVisible()

  await page.getByRole("button", { name: "Đăng nhập" }).click()
  await expect(page).toHaveURL(/\/discover$/u)
})

test("trang /verify-email: không lỗi → thành công, có ?error= → hiện lý do", async ({ page }) => {
  await page.goto("/verify-email")
  await expect(page.getByText("Email đã được xác thực")).toBeVisible()

  await page.goto("/verify-email?error=TOKEN_EXPIRED")
  await expect(page.getByText("Link xác thực đã hết hạn.")).toBeVisible()
  await expect(page.getByLabel("Email")).toBeVisible()
})

test("quên mật khẩu luôn hiện thông báo trung tính", async ({ page }) => {
  await page.goto("/forgot-password")

  await page.getByLabel("Email").fill("khong-ton-tai@rendez.test")
  await page.getByRole("button", { name: "Gửi link đặt lại" }).click()
  await expect(page.getByText("Đã gửi yêu cầu")).toBeVisible()
})

test("trang đặt lại mật khẩu thiếu token hiện cảnh báo", async ({ page }) => {
  await page.goto("/reset-password")
  await expect(page.getByText("Không thể đặt lại mật khẩu")).toBeVisible()
})
