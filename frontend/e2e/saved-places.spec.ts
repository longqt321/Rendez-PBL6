import { expect, test } from "@playwright/test"

/**
 * Tab "Địa điểm" ở `/saved` — địa điểm nằm trong bộ sưu tập của tôi.
 *
 * Cold-start không seed bộ sưu tập giả, nên test tạo bộ sưu tập qua UI thật:
 * mở một địa điểm trên /discover → "Lưu vào bộ sưu tập" → tạo bộ sưu tập mới
 * (tự động lưu địa điểm đang mở) → xem tab "Địa điểm" ở /saved.
 */
test("tab Địa điểm hiện các quán đã lưu trong bộ sưu tập", async ({ page }) => {
  await page.goto("/discover")
  await page.locator('a[href^="/discover/"]').first().click()

  await page.getByRole("button", { name: "Lưu vào bộ sưu tập" }).click()
  await page.getByLabel("Tạo bộ sưu tập mới").fill("Bộ sưu tập kiểm tra e2e")
  await page.getByRole("button", { name: "Tạo", exact: true }).click()
  await expect(page.getByText(/Đã tạo “Bộ sưu tập kiểm tra e2e”/)).toBeVisible()
  await page.keyboard.press("Escape") // đóng dialog để bấm được menu người dùng

  await page.getByRole("button", { name: "Mở menu người dùng" }).click()
  await page.getByRole("menuitem", { name: "Địa điểm & Bộ sưu tập" }).click()
  await page.getByRole("tab", { name: "Địa điểm" }).click()

  const placeCards = page.locator('a[href^="/discover/"]')
  await expect(placeCards.first()).toBeVisible()
  expect(await placeCards.count()).toBeGreaterThan(0)
})
