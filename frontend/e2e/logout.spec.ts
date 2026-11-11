import { expect, test } from "@playwright/test"

/**
 * Đăng xuất → trang đăng nhập → đăng nhập lại.
 *
 * Mock giữ dữ liệu trong bộ nhớ nên không `page.goto` lại giữa chừng (reload
 * reset phiên mock). Tài khoản dev: `me@rendez.test` / `password123`.
 */
test("đăng xuất rồi đăng nhập lại qua form /login", async ({ page }) => {
  await page.goto("/")

  const menuButton = page.getByRole("button", { name: "Mở menu người dùng" })
  await menuButton.click()
  await page.getByRole("menuitem", { name: "Đăng xuất" }).click()
  await expect(page.getByRole("menu")).toBeHidden()

  // Avatar đổi sang icon khách khi `GET /me` trả 401 — tín hiệu trạng thái thật,
  // dùng thay cho sleep chờ animation đóng menu.
  await expect(menuButton.locator("svg.lucide-user")).toBeVisible()

  await menuButton.click()
  await page.getByRole("menuitem", { name: "Đăng nhập" }).click()
  await expect(page).toHaveURL(/\/login$/u)

  await page.getByLabel("Email").fill("me@rendez.test")
  await page.getByLabel("Mật khẩu").fill("password123")
  await page.getByRole("button", { name: "Đăng nhập" }).click()

  // Đăng nhập xong về trang khám phá, avatar trở lại chữ cái đầu của hồ sơ.
  await expect(page).toHaveURL(/\/discover$/u)
  await expect(menuButton).toContainText("MA")

  await menuButton.click()
  await expect(page.getByRole("menuitem", { name: "Đăng xuất" })).toBeVisible()
})
