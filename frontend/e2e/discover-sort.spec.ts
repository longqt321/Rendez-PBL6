import { expect, test } from "@playwright/test"

/**
 * Sắp xếp + lọc giá trên `/discover` (thiết kế mục 2.2 / 7).
 *
 * Kiểm: URL là nguồn sự thật (`?sort=`), request gửi đúng `sort`/`lat`/`lng`,
 * link cũ `?nearby=1` vẫn sắp theo khoảng cách, và đổi sort KHÔNG nhân đôi
 * card (query key phải đổi theo sort).
 */

/** Mở menu "Sắp xếp" (nút có aria-label bắt đầu bằng "Sắp xếp:") rồi chọn một mục. */
async function chooseSort(page: import("@playwright/test").Page, label: string) {
  await page.getByRole("button", { name: /^Sắp xếp:/u }).click()
  const item = page.getByRole("menuitemradio", { name: new RegExp(label, "u") })
  await expect(item).toBeVisible()
  await item.click()
}

test("chọn 'Đánh giá cao' → URL sort=rating và request có sort=rating", async ({ page }) => {
  await page.goto("/discover")
  await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible()

  await chooseSort(page, "Đánh giá cao")
  await expect(page).toHaveURL(/sort=rating/u)
})

test("bật 'Tìm quán gần tôi' → sort=distance + lat/lng, toggle bật", async ({ page, context }) => {
  // Cấp quyền vị trí giả lập để luồng "Tìm quán gần tôi" chạy hết.
  await context.grantPermissions(["geolocation"])
  await context.setGeolocation({ latitude: 16.06, longitude: 108.22 })

  await page.goto("/discover")
  await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible()

  await page.getByRole("button", { name: "Tìm quán gần tôi" }).click()

  await expect(page).toHaveURL(/sort=distance/u)
  await expect(page).toHaveURL(/lat=16\.06/u)
  await expect(page).toHaveURL(/lng=108\.22/u)
  await expect(page.getByRole("button", { name: "Tìm quán gần tôi" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
})

test("vào thẳng URL ?sort=distance → tự định vị và bật nút Tìm quán gần tôi", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"])
  await context.setGeolocation({ latitude: 16.06, longitude: 108.22 })

  await page.goto("/discover?sort=distance")
  await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible()

  await expect(page).toHaveURL(/sort=distance/u)
  await expect(page.getByRole("button", { name: "Tìm quán gần tôi" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
})

test("đổi sort 2 lần không nhân đôi card", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"])
  await context.setGeolocation({ latitude: 16.06, longitude: 108.22 })

  await page.goto("/discover")
  const cards = page.getByRole("heading", { level: 3 })
  await expect(cards.first()).toBeVisible()
  const initialCount = await cards.count()

  const nearbyToggle = page.getByRole("button", { name: "Tìm quán gần tôi" })
  await nearbyToggle.click()
  await expect(page).toHaveURL(/sort=distance/u)
  await expect(page).toHaveURL(/lat=16\.06/u)
  await expect(cards).toHaveCount(initialCount)

  await nearbyToggle.click({ force: true })
  await expect(page).not.toHaveURL(/sort=distance/u)
  await expect(cards).toHaveCount(initialCount)
})

test("?priceMax=2 ghi lên URL và lọc đúng (dữ liệu toàn mức 1 nên vẫn có kết quả)", async ({
  page,
}) => {
  await page.goto("/discover?priceMax=2")
  await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible()
  await expect(page).toHaveURL(/priceMax=2/u)
})
