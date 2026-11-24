import { expect, test, type Page } from "@playwright/test"
import { e2eAccount } from "./credentials.js"

/**
 * Vòng đời tài khoản (G1): đăng nhập, đăng ký, quên mật khẩu, verify email.
 *
 * Tài khoản đăng nhập lấy từ `e2eAccount()`: mock dùng tài khoản dev
 * `me@rendez.test` / `password123` (xem `src/mocks/server.ts`); project backend
 * dùng tài khoản demo do global-setup tạo qua API thật.
 */
test.describe.configure({ mode: "serial" })

/**
 * Đưa trang về trạng thái KHÁCH rồi mở `/login` bằng điều hướng SPA.
 *
 * Vì sao không `page.goto("/login")`: người đã đăng nhập bị chuyển ngay về
 * `/discover` (V1-09), còn mock dev (`VITE_DEV_BYPASS_AUTH`) coi mọi lần tải
 * trang là đã đăng nhập. Mock là bộ nhớ trong trang nên phải đăng xuất qua UI
 * rồi điều hướng SPA — tải lại trang là mock reset về trạng thái đăng nhập.
 */
async function openLoginAsGuest(page: Page): Promise<void> {
  await page.goto("/discover")
  const menuButton = page.getByRole("button", { name: "Mở menu người dùng" })
  await menuButton.click()
  await page.getByRole("menuitem", { name: "Đăng xuất" }).click()
  // Avatar đổi sang icon khách khi `GET /me` trả 401 — tín hiệu trạng thái thật.
  await expect(menuButton.locator("svg.lucide-user")).toBeVisible()

  await menuButton.click()
  await page.getByRole("menuitem", { name: "Đăng nhập" }).click()
  await expect(page).toHaveURL(/\/login$/u)
}

/** Giống `openLoginAsGuest` nhưng mở `/register`. */
async function openRegisterAsGuest(page: Page): Promise<void> {
  await page.goto("/discover")
  const menuButton = page.getByRole("button", { name: "Mở menu người dùng" })
  await menuButton.click()
  await page.getByRole("menuitem", { name: "Đăng xuất" }).click()
  await expect(menuButton.locator("svg.lucide-user")).toBeVisible()

  await menuButton.click()
  await page.getByRole("menuitem", { name: "Đăng ký" }).click()
  await expect(page).toHaveURL(/\/register$/u)
}

test("đăng nhập sai mật khẩu hiện lỗi, đúng mật khẩu về trang khám phá", async ({ page }) => {
  const account = e2eAccount()
  await openLoginAsGuest(page)

  await page.getByLabel("Email").fill(account.email)
  await page.getByLabel("Mật khẩu", { exact: true }).fill("sai-mat-khau")
  await page.getByRole("button", { name: "Đăng nhập" }).click()
  await expect(page.getByText("Email hoặc mật khẩu không đúng")).toBeVisible()

  await page.getByLabel("Mật khẩu", { exact: true }).fill(account.password)
  await page.getByRole("button", { name: "Đăng nhập" }).click()
  await expect(page).toHaveURL(/\/discover$/u)
})

test("đã đăng nhập mở /login bị chuyển về /discover", async ({ page }) => {
  // Mock dev tự đăng nhập — đủ để kiểm redirect (V1-09); project backend cũng
  // chạy được vì storageState có phiên.
  await page.goto("/login")
  await expect(page).toHaveURL(/\/discover$/u)
})

test("đã đăng nhập mở /login?next=… được đưa về đúng trang next", async ({ page }) => {
  await page.goto("/login?next=/profile")
  await expect(page).toHaveURL(/\/profile$/u)
})

test("?next= không phải path relative thì bị bỏ qua (chống open redirect)", async ({ page }) => {
  await page.goto("/login?next=https%3A%2F%2Fevil.example.com")
  await expect(page).toHaveURL(/\/discover$/u)
})

test("email để trống báo 'Cần nhập email'", async ({ page }) => {
  await openLoginAsGuest(page)
  await page.getByRole("button", { name: "Đăng nhập" }).click()
  await expect(page.getByText("Cần nhập email")).toBeVisible()
})

test("đăng ký tài khoản mới → yêu cầu đồng ý điều khoản và hiện màn hình kiểm tra email", async ({
  page,
}) => {
  const handle = `e2e_${Date.now().toString(36).slice(-6)}`
  await openRegisterAsGuest(page)

  await page.getByLabel("Tên hiển thị").fill("E2E Tester")
  await page.getByLabel("Email").fill(`${handle}@rendez.test`)
  await page.getByLabel("Tên người dùng").fill(handle)
  await page.getByLabel("Mật khẩu", { exact: true }).fill("password123")
  await page.getByLabel("Nhập lại mật khẩu").fill("password123")
  await page.getByRole("button", { name: "Đăng ký" }).click()
  await expect(page.getByText(/Bạn cần đồng ý Điều khoản sử dụng/i)).toBeVisible()

  await page.getByRole("checkbox").click()
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

  await openRegisterAsGuest(page)
  await page.getByLabel("Tên hiển thị").fill("E2E Tester")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Tên người dùng").fill(handle)
  await page.getByLabel("Mật khẩu", { exact: true }).fill("password123")
  await page.getByLabel("Nhập lại mật khẩu").fill("password123")
  await page.getByRole("checkbox").click()
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

test("trang /verify-email: ?verified=1 → thành công, thiếu marker/?error= → link không hợp lệ", async ({
  page,
}) => {
  // Thành công chỉ khi link redirect từ API kèm marker `verified=1`.
  await page.goto("/verify-email?verified=1")
  await expect(page.getByText("Email đã được xác thực")).toBeVisible()

  // Mở trực tiếp (không có token, không có marker) → KHÔNG được hiện thành công.
  await page.goto("/verify-email")
  await expect(page.getByText("Chưa xác thực được email")).toBeVisible()
  await expect(page.getByLabel("Email")).toBeVisible()

  await page.goto("/verify-email?error=TOKEN_EXPIRED")
  // Text khớp bảng map dùng chung `auth-error-messages.ts`.
  await expect(page.getByText("Link đã hết hạn. Hãy yêu cầu link mới.")).toBeVisible()
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
