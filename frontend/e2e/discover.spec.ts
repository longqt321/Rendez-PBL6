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

// Dải "Gợi ý hôm nay" — 3 quán server chọn, đứng trên lưới kết quả.
test.describe("Gợi ý hôm nay", () => {
  test("hiện dải gợi ý với 3 card và không phá lưới bên dưới", async ({ page }) => {
    await page.goto("/discover")

    // Dải là region có heading riêng (aria-labelledby) — tìm được qua role.
    const picks = page.getByRole("region", { name: /Gợi ý hôm nay/u })
    await expect(picks).toBeVisible()
    await expect(picks.getByRole("heading", { level: 2 })).toContainText(/Gợi ý hôm nay/u)

    // 3 card picks dùng lại PlaceCard: h3 + link sang trang chi tiết.
    const pickCards = picks.getByRole("heading", { level: 3 })
    await expect(pickCards).toHaveCount(3)

    // Lưới kết quả bên dưới vẫn hoạt động: vẫn còn card ngoài dải gợi ý.
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(12, { timeout: 10_000 })

    // Bấm card picks đầu → trang chi tiết như bấm card thường.
    await picks.getByRole("heading", { level: 3 }).first().getByRole("link").click()
    await expect(page).toHaveURL(/\/discover\//u)
  })
})
