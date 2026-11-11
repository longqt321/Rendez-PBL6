import { expect, test } from "@playwright/test"

// Mỗi card bài đăng có link vào trang bài đăng — đếm để so phân trang.
const postLinks = (page: import("@playwright/test").Page) => page.locator('a[href^="/post/"]')

/**
 * Đăng bài qua composer thật.
 *
 * Cold-start không seed bài đăng giả, nên e2e tự đăng bài qua UI — vừa có nội
 * dung để kiểm tra, vừa phủ luồng đăng bài thật (mock server không nhận fetch
 * thuần vì nó là axios adapter, không phải MSW).
 */
async function postViaComposer(page: import("@playwright/test").Page, caption: string) {
  const composer = page.getByRole("textbox", { name: "Nội dung bài đăng" })
  await composer.fill(caption)
  await page.getByRole("button", { name: "Đăng", exact: true }).click()
  // Ô soạn bài được xoá rỗng khi đăng thành công.
  await expect(composer).toHaveValue("")
}

// Cộng đồng: feed có bài, cuộn xuống đáy nạp thêm (phân trang vô hạn).
test("feed có bài đăng và phân trang khi cuộn", async ({ page }) => {
  await page.goto("/social")
  for (let i = 1; i <= 7; i += 1) {
    await postViaComposer(page, `Bài kiểm tra e2e ${i}`)
  }

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

// Trang cá nhân: tab "Bài đăng" có bài vừa đăng.
test("tab bài đăng của tôi có nội dung", async ({ page }) => {
  await page.goto("/social")
  await postViaComposer(page, "Bài kiểm tra tab bài đăng")

  await page.getByRole("button", { name: "Mở menu người dùng" }).click()
  await page.getByRole("menuitem", { name: "Trang cá nhân" }).click()

  await expect(page.getByRole("tab", { name: "Bài đăng" })).toBeVisible()
  await expect(page.locator('a[href^="/post/"]').first()).toBeVisible()
})

// Tab "Đang theo dõi" (G3): mock chỉ có bài của chính mình nên feed rỗng —
// kiểm tab tồn tại, gọi đúng filter và hiện empty state riêng.
test("tab Đang theo dõi hiện empty state khi chưa theo dõi ai", async ({ page }) => {
  await page.goto("/social")
  await postViaComposer(page, "Bài của tôi không thuộc feed following")

  await page.getByRole("tab", { name: "Đang theo dõi" }).click()
  await expect(page.getByText("Theo dõi ai đó để thấy bài của họ ở đây.")).toBeVisible()
  await expect(postLinks(page)).toHaveCount(0)
})

// Ảnh bài đăng (G5b): chọn 2 ảnh → mock cấp presigned URL giả → bài hiện lưới ảnh.
// Mock không có storage thật nên client bỏ qua bước PUT (host `mock-r2.test`).
const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)

test("đăng bài kèm ảnh qua composer", async ({ page }) => {
  await page.goto("/social")
  const composer = page.getByRole("textbox", { name: "Nội dung bài đăng" })
  await composer.fill("Bài kiểm tra có ảnh đính kèm")

  const fileChooserPromise = page.waitForEvent("filechooser")
  await page.getByRole("button", { name: /Thêm ảnh/ }).click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles([
    { name: "anh-1.png", mimeType: "image/png", buffer: ONE_PIXEL_PNG },
    { name: "anh-2.png", mimeType: "image/png", buffer: ONE_PIXEL_PNG },
  ])

  // Preview hiện ngay khi chọn, trước khi bấm Đăng.
  await expect(page.locator('img[alt^="Ảnh sẽ đính kèm"]')).toHaveCount(2)

  await page.getByRole("button", { name: "Đăng", exact: true }).click()
  await expect(composer).toHaveValue("")
  await expect(page.locator('img[alt^="Ảnh 1/2 của bài đăng"]').first()).toBeVisible()
})
