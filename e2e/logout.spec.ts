import { expect, test } from "@playwright/test"

/**
 * Đăng xuất ở dev (mock): server tắt phiên → `GET /me` trả 401 → menu người
 * dùng đổi thành "Đăng nhập"; mock giữ dữ liệu trong bộ nhớ nên tải lại trang
 * sẽ đăng nhập lại — test chỉ kiểm trong cùng phiên, không `page.goto` lại
 * giữa chừng (reload reset phiên mock).
 */
test("đăng xuất rồi đăng nhập lại qua menu người dùng", async ({ page }) => {
  await page.goto("/")

  const menuButton = page.getByRole("button", { name: "Mở menu người dùng" })
  await menuButton.click()
  await page.getByRole("menuitem", { name: "Đăng xuất" }).click()
  await expect(page.getByRole("menu")).toBeHidden()

  // Avatar đổi sang icon khách khi `GET /me` trả 401 — tín hiệu trạng thái thật,
  // dùng thay cho sleep chờ animation đóng menu.
  await expect(menuButton.locator("svg.lucide-user")).toBeVisible()

  await menuButton.click()
  await expect(page.getByRole("menuitem", { name: "Đăng nhập" })).toBeVisible()

  // Đăng nhập lại: avatar trở về chữ cái đầu của hồ sơ.
  await page.getByRole("menuitem", { name: "Đăng nhập" }).click()
  await expect(page.getByRole("menu")).toBeHidden()
  await expect(menuButton).toContainText("MA")

  await menuButton.click()
  await expect(page.getByRole("menuitem", { name: "Đăng xuất" })).toBeVisible()
})
