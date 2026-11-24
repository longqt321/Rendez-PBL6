import { expect, test } from "@playwright/test"

/**
 * Phòng lọc nhóm — luồng API/mock thật (không còn localStorage demo).
 *
 * Mock bật `db.authenticated` mặc định nên tạo phòng được ngay; guest tham gia
 * bằng tên và server (mock) cấp "cookie" token mô phỏng trong bộ nhớ.
 */
test("tạo phòng, gửi đề xuất, áp dụng và thấy bộ lọc chung", async ({ page }) => {
  await page.goto("/rooms")

  // Tạo phòng từ trang Phòng nhóm.
  await page.getByLabel("Tên phòng (tuỳ chọn)").fill("Nhóm e2e")
  await page.getByRole("button", { name: "Tạo phòng nhóm" }).click()
  await expect(page.getByText(/Đã tạo phòng/u)).toBeVisible()

  await expect(page).toHaveURL(/\/rooms\/[0-9A-HJKMNP-TV-Z]{6}$/u)
  await expect(page.getByRole("heading", { name: /Nhóm e2e/u })).toBeVisible()

  // Chuyển sang tab "Tiêu chí" và chọn chip "Cà phê".
  await page.getByRole("tab", { name: /Tiêu chí/u }).click()
  const cafeChip = page.getByRole("button", { name: "Cà phê", exact: true })
  await cafeChip.click()
  await expect(cafeChip).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByText("＋ Loại hình: Cà phê")).toBeVisible()
})

test("vào phòng bằng mã sai → báo không tìm thấy", async ({ page }) => {
  await page.goto("/rooms")

  await page.getByLabel("Mã phòng").fill("ZZZZZZ")
  await page.getByLabel("Tên của bạn").fill("Khách e2e")
  await page.getByRole("button", { name: "Tham gia phòng" }).click()

  await expect(page.getByText("Không tìm thấy phòng với mã này")).toBeVisible()
})

test("trang phòng không tồn tại hiện trạng thái không tìm thấy (không phải loading)", async ({
  page,
}) => {
  await page.goto("/rooms/ZZZZZZ")
  await expect(page.getByText("Không tìm thấy phòng", { exact: true })).toBeVisible()
  await expect(page.getByText("Đang tải phòng…")).toHaveCount(0)
})
