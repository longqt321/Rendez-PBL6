import { expect, test } from "@playwright/test"

// Route lạ → trang 404; id quán lạ → trạng thái không tìm thấy trong trang chi tiết.
test("hiện trang 404 và trạng thái không tìm thấy", async ({ page }) => {
  await page.goto("/route-khong-co")
  await expect(page.getByRole("heading", { level: 1, name: "Không tìm thấy trang" })).toBeVisible()

  // QueryClient mặc định retry 3 lần (~7s) trước khi coi 404 là lỗi cuối — tăng timeout.
  await page.goto("/discover/id-khong-ton-tai")
  await expect(
    page.getByRole("heading", { level: 1, name: "Không tìm thấy địa điểm" }),
  ).toBeVisible({ timeout: 15_000 })
})
