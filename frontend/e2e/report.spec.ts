import { expect, test } from "@playwright/test"

// Báo cáo địa điểm: mở dialog → chọn lý do → gửi → dialog đóng + toast thành công.
test("gửi báo cáo quán đã đóng cửa", async ({ page }) => {
  await page.goto("/discover/banh-xeo-ba-duong")

  await page.getByRole("button", { name: "Báo cáo" }).click()
  await expect(page.getByRole("dialog")).toBeVisible()

  // Lý do mặc định đã là "Quán đã đóng cửa" — click để chắc chắn trạng thái.
  await page.getByRole("radio", { name: /Quán đã đóng cửa/u }).click()
  await page.getByRole("button", { name: /Gửi báo cáo/u }).click()

  // Dialog đóng sau khi gửi thành công.
  await expect(page.getByRole("dialog")).not.toBeVisible()
  // Toast thành công của sonner.
  await expect(page.locator("[data-sonner-toast]")).toContainText("Đã gửi báo cáo")
})
