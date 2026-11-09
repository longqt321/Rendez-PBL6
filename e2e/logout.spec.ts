import { expect, test } from "@playwright/test"

/**
 * Đăng xuất ở dev (mock): server tắt phiên → `GET /me` trả 401 → menu người
 * dùng đổi thành nút "Đăng nhập"; mock giữ dữ liệu trong bộ nhớ nên reload
 * trang sẽ đăng nhập lại — test chỉ kiểm trong cùng phiên.
 */
test("đăng xuất rồi đăng nhập lại qua menu người dùng", async ({ page }) => {
  await page.goto("/")

  const menuButton = page.getByRole("button", { name: "Mở menu người dùng" })
  await menuButton.click()
  await page.getByRole("menuitem", { name: "Đăng xuất" }).click()
  await expect(page.getByRole("menuitem", { name: "Đăng xuất" })).toBeHidden()
  // Chờ menu đóng xong (Base UI có transition) — click ngay bị nuốt.
  await page.waitForTimeout(300)

  // Sau đăng xuất, mở lại menu → chỉ còn mục đăng nhập.
  await menuButton.click()
  await expect(page.getByRole("menuitem", { name: "Đăng nhập" })).toBeVisible()

  // Đăng nhập lại: menu trở về trạng thái đã đăng nhập.
  await page.getByRole("menuitem", { name: "Đăng nhập" }).click()
  await expect(page.getByRole("menuitem", { name: "Đăng nhập" })).toBeHidden()
  await page.waitForTimeout(300)
  await menuButton.click()
  await expect(page.getByRole("menuitem", { name: "Đăng xuất" })).toBeVisible()
})
