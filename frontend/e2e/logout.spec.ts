import { expect, test } from "@playwright/test"
import { e2eAccount } from "./credentials.js"

/**
 * Đăng xuất → trang đăng nhập → đăng nhập lại.
 *
 * Bắt đầu bằng đăng nhập qua form trong chính context này: phiên tạo ra là phiên
 * riêng, nên đăng xuất KHÔNG thu hồi phiên storageState dùng chung của các spec
 * khác (logout trên backend thật xoá session ở server — phiên dùng chung bị
 * chết khiến mọi spec chạy song song nhận 401).
 */
test("đăng xuất rồi đăng nhập lại qua form /login", async ({ page }) => {
  const account = e2eAccount()

  await page.goto("/login")
  await page.getByLabel("Email").fill(account.email)
  await page.getByLabel("Mật khẩu", { exact: true }).fill(account.password)
  await page.getByRole("button", { name: "Đăng nhập" }).click()
  await expect(page).toHaveURL(/\/discover$/u)

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

  await page.getByLabel("Email").fill(account.email)
  await page.getByLabel("Mật khẩu", { exact: true }).fill(account.password)
  await page.getByRole("button", { name: "Đăng nhập" }).click()

  // Đăng nhập xong về trang khám phá, avatar trở lại chữ cái đầu của hồ sơ.
  await expect(page).toHaveURL(/\/discover$/u)
  await expect(menuButton).toContainText("MA")

  await menuButton.click()
  await expect(page.getByRole("menuitem", { name: "Đăng xuất" })).toBeVisible()
})
