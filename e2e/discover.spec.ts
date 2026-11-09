import { expect, test } from "@playwright/test"

// Khám phá: lưới card quán từ mock cold-start + điều hướng sang trang chi tiết.
test("hiện card quán thật và mở được trang chi tiết", async ({ page }) => {
  await page.goto("/discover")

  // Card quán: tên nằm trong h3 (PlaceCard).
  const cardTitles = page.getByRole("heading", { level: 3 })
  await expect(cardTitles.first()).toBeVisible()
  const count = await cardTitles.count()
  expect(count).toBeGreaterThanOrEqual(1)

  // Ảnh card dùng bộ cold-start thật, không phải ảnh bịa/picsum.
  const cardImage = page.locator('img[alt^="Ảnh "]').first()
  await expect(cardImage).toBeVisible()
  await expect(cardImage).toHaveAttribute("src", /\/data\/cold-start\//u)

  // Click card đầu → trang chi tiết hiện h1 tên quán + ảnh quán.
  await page.getByRole("heading", { level: 3 }).first().getByRole("link").click()
  await expect(page).toHaveURL(/\/discover\//u)
  await expect(page.getByRole("heading", { level: 1, name: /.+/ }).last()).toBeVisible()
  await expect(page.locator("main img").first()).toBeVisible()
})
