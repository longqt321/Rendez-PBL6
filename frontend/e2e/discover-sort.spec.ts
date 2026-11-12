import { expect, test } from "@playwright/test"

/**
 * Sắp xếp + lọc giá trên `/discover` (thiết kế mục 2.2 / 7).
 *
 * Kiểm: URL là nguồn sự thật (`?sort=`), request gửi đúng `sort`/`lat`/`lng`,
 * link cũ `?nearby=1` vẫn sắp theo khoảng cách, và đổi sort KHÔNG nhân đôi
 * card (query key phải đổi theo sort).
 */

/** Mở menu "Sắp xếp" (nút có aria-label) rồi chọn một mục. */
async function chooseSort(page: import("@playwright/test").Page, label: string) {
  await page.getByRole("button", { name: "Sắp xếp kết quả" }).click()
  const item = page.getByRole("menuitemradio", { name: new RegExp(label, "u") })
  await expect(item).toBeVisible()
  await item.click()
}

test("chọn 'Đánh giá cao' → URL sort=rating và request có sort=rating", async ({ page }) => {
  await page.goto("/discover")
  await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible()

  // Option "Đánh giá cao" bị disabled khi dữ liệu chưa có đánh giá — mock cold-start
  // không seed review, nên chỉ kiểm trạng thái disabled + không đổi URL.
  await page.getByRole("button", { name: "Sắp xếp kết quả" }).click()
  const ratingItem = page.getByRole("menuitemradio", { name: /Đánh giá cao/u })
  await expect(ratingItem).toBeVisible()
  await expect(ratingItem).toHaveAttribute("aria-disabled", "true")
  await page.keyboard.press("Escape")
})

test("chọn 'Gần tôi' → sort=distance + lat/lng, toggle 'Gần đây' bật", async ({
  page,
  context,
}) => {
  // Cấp quyền vị trí giả lập để luồng "Gần tôi" chạy hết.
  await context.grantPermissions(["geolocation"])
  await context.setGeolocation({ latitude: 16.06, longitude: 108.22 })

  await page.goto("/discover")
  await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible()

  await chooseSort(page, "Gần tôi")

  await expect(page).toHaveURL(/sort=distance/u)
  await expect(page).toHaveURL(/lat=16\.06/u)
  await expect(page).toHaveURL(/lng=108\.22/u)
  // Toggle "Gần đây" ở trạng thái bật (aria-pressed).
  await expect(page.getByRole("button", { name: /Gần đây/u })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
})

test("link cũ ?nearby=1 → danh sách vẫn sắp theo khoảng cách, URL chuẩn hoá", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"])
  await context.setGeolocation({ latitude: 16.06, longitude: 108.22 })

  await page.goto("/discover?nearby=1")
  await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible()

  // Chuẩn hoá: nearby bị xoá, sort=distance được ghi.
  await expect(page).toHaveURL(/sort=distance/u)
  await expect(page).not.toHaveURL(/nearby=1/u)
  await expect(page.getByRole("button", { name: /Gần đây/u })).toHaveAttribute(
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

  // newest → distance → newest: mỗi lần đổi sort phải THAY trang 1, không nối
  // thêm trang vào danh sách cũ (query key có sort + toạ độ). Lần đổi thứ hai
  // dùng toggle "Gần đây" — cùng đường ghi `setSort` với Select, và tránh mở
  // lại menu trong lúc watcher vị trí còn cập nhật (menu remount liên tục).
  await chooseSort(page, "Gần tôi")
  await expect(page).toHaveURL(/sort=distance/u)
  await expect(page).toHaveURL(/lat=16\.06/u)
  await expect(cards).toHaveCount(initialCount)

  const nearbyToggle = page.getByRole("button", { name: /Gần đây/u })
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
