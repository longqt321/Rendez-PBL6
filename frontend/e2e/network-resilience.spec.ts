import { expect, test } from "@playwright/test"

/**
 * E2E Test Suite: Khả năng phục hồi khi lỗi mạng (Network Resilience & Error State)
 *
 * 1. Mở trang `/discover`.
 * 2. Giả lập kịch bản server-error qua mock adapter runtime: `window.__setMockScenario('server-error')`.
 * 3. Bấm chọn quận khác (ví dụ: "Hải Châu") trên toolbar để trigger query mới → Giao diện hiển thị
 *    component `ErrorState` ("Không tải được danh sách địa điểm") kèm nút "Thử lại".
 * 4. Khôi phục kịch bản: `window.__setMockScenario('ok')`.
 * 5. Bấm nút "Thử lại" → Giao diện nạp lại dữ liệu bình thường, các card quán hiển thị trở lại.
 */
test("hiển thị ErrorState khi server lỗi và phục hồi thành công khi bấm Thử lại", async ({
  page,
}) => {
  await page.goto("/discover")
  await expect(page.locator('a[href^="/discover/"]').first()).toBeVisible({ timeout: 10_000 })

  // Kích hoạt kịch bản lỗi 500
  await page.evaluate(() => {
    const win = window as unknown as { __setMockScenario?: (name: string) => void }
    win.__setMockScenario?.("server-error")
  })

  // Đổi bộ lọc quận sang "Hải Châu" để trigger API mới đang bị lỗi 500
  await page.getByRole("button", { name: "Lọc theo khu vực" }).click()
  await page.getByRole("menuitemradio", { name: "Hải Châu" }).click()

  // Kiểm tra màn hình báo lỗi ErrorState xuất hiện
  const errorHeading = page.getByText("Không tải được danh sách địa điểm")
  await expect(errorHeading).toBeVisible({ timeout: 10_000 })

  const retryBtn = page.getByRole("button", { name: "Thử lại" })
  await expect(retryBtn).toBeVisible()

  // Khôi phục server về kịch bản bình thường "ok"
  await page.evaluate(() => {
    const win = window as unknown as { __setMockScenario?: (name: string) => void }
    win.__setMockScenario?.("ok")
  })

  // Bấm nút "Thử lại"
  await retryBtn.click()

  // Màn hình lỗi biến mất, card quán xuất hiện trở lại
  await expect(errorHeading).not.toBeVisible()
  const placeCards = page.locator('a[href^="/discover/"]')
  await expect(placeCards.first()).toBeVisible({ timeout: 10_000 })
  expect(await placeCards.count()).toBeGreaterThan(0)
})
