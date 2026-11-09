import { expect, test } from "@playwright/test"

/**
 * Tab "Địa điểm" ở `/saved` — địa điểm nằm trong bộ sưu tập của tôi.
 *
 * Trước đây tab này luôn rỗng vì chưa có endpoint; nay dùng `GET /places/saved`.
 */
test("tab Địa điểm hiện các quán đã lưu trong bộ sưu tập", async ({ page }) => {
  await page.goto("/saved")
  await page.getByRole("tab", { name: "Địa điểm" }).click()

  const placeCards = page.locator('a[href^="/discover/"]')
  await expect(placeCards.first()).toBeVisible()
  expect(await placeCards.count()).toBeGreaterThan(0)
})
