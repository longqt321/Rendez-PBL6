import { expect, test } from "@playwright/test"

// Mỗi card bài đăng có link "Mở bài đăng của <tác giả>" — đếm để so phân trang.
const postLinks = (page: import("@playwright/test").Page) =>
  page.getByRole("link", { name: /^Mở bài đăng của /u })

// Cộng đồng: feed có bài, cuộn xuống đáy nạp thêm (phân trang vô hạn).
test("feed có bài đăng và phân trang khi cuộn", async ({ page }) => {
  await page.goto("/social")

  await expect(postLinks(page).first()).toBeVisible()
  const before = await postLinks(page).count()

  // Cuộn xuống đáy 3 lần — useInfiniteScroll cần sentinel vào viewport.
  for (let i = 0; i < 3; i += 1) {
    await page.mouse.wheel(0, 20_000)
    await page.waitForTimeout(500)
  }
  const after = await postLinks(page).count()
  expect(after).toBeGreaterThan(before)
})

// Trang cá nhân: tab "Bài đăng" mặc định có ít nhất 1 bài.
test("tab bài đăng của tôi có nội dung", async ({ page }) => {
  await page.goto("/profile")

  await expect(page.getByRole("tab", { name: "Bài đăng" })).toBeVisible()
  await expect(page.locator('a[href^="/post/"]').first()).toBeVisible()
})
