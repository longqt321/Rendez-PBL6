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

test("đăng ký tài khoản mới → đăng nhập luôn và thấy avatar", async ({ page }) => {
  const handle = `e2e_${Date.now().toString(36).slice(-6)}`
  await page.goto("/register")

  await page.getByLabel("Tên hiển thị").fill("E2E Tester")
  await page.getByLabel("Email").fill(`${handle}@rendez.test`)
  await page.getByLabel("Handle").fill(handle)
  await page.getByLabel("Mật khẩu", { exact: true }).fill("password123")
  await page.getByLabel("Nhập lại mật khẩu").fill("password123")
  await page.getByRole("button", { name: "Đăng ký" }).click()

  await expect(page).toHaveURL(/\/discover$/u)
  await expect(page.getByRole("button", { name: "Mở menu người dùng" })).toContainText("ET")
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
