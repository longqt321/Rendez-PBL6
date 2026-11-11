import { expect, test } from "@playwright/test"

/**
 * Phòng lọc nhóm — luồng API/mock thật (không còn localStorage demo).
 *
 * Mock bật `db.authenticated` mặc định nên tạo phòng được ngay; guest tham gia
 * bằng tên và server (mock) cấp "cookie" token mô phỏng trong bộ nhớ.
 */
test("tạo phòng, gửi đề xuất, áp dụng và thấy bộ lọc chung", async ({ page }) => {
  await page.goto("/discover")

  // Mở dialog "Đi cùng nhóm" và tạo phòng.
  await page.getByRole("button", { name: "Đi cùng nhóm" }).click()
  await page.getByLabel("Tạo phòng mới").fill("Nhóm e2e")
  await page.getByRole("button", { name: "Tạo phòng", exact: true }).click()
  await expect(page.getByText(/Đã tạo phòng/u)).toBeVisible()

  // Banner phòng hiện trên trang khám phá.
  await expect(page.getByText("Nhóm e2e")).toBeVisible()
  await page.getByRole("link", { name: "Mở phòng" }).click()
  await expect(page).toHaveURL(/\/rooms\/[0-9A-HJKMNP-TV-Z]{6}$/u)
  await expect(page.getByRole("heading", { name: /Nhóm e2e/u })).toBeVisible()
  await expect(page.getByText("Đang lọc")).toBeVisible()

  // Gửi đề xuất loại hình (mặc định tab "Loại hình", chọn chip Cà phê).
  const cafeChip = page.getByRole("button", { name: "Cà phê", exact: true })
  await cafeChip.click()
  await expect(cafeChip).toHaveAttribute("aria-pressed", "true")
  await page.getByRole("button", { name: "Gửi đề xuất" }).click()
  // Chờ xác nhận từ server (toast chỉ hiện khi POST thành công).
  await expect(page.getByText("Đã gửi đề xuất cho cả nhóm")).toBeVisible()
  await expect(page.getByText("＋ Loại hình: Cà phê")).toBeVisible()

  // Áp dụng → toast dùng summary từ server + filter chung đổi.
  await page.getByRole("button", { name: "Áp dụng" }).click()
  await expect(page.getByText(/Đã áp dụng: ＋ Loại hình: Cà phê/u)).toBeVisible()
  await expect(page.getByText("Cà phê", { exact: true }).first()).toBeVisible()
})

test("vào phòng bằng mã sai → báo không tìm thấy", async ({ page }) => {
  await page.goto("/discover")
  await page.getByRole("button", { name: "Đi cùng nhóm" }).click()

  await page.getByPlaceholder("Mã 6 ký tự").fill("ZZZZZZ")
  await page.getByLabel("Tên hiển thị của bạn").fill("Khách e2e")
  await page.getByRole("button", { name: "Vào phòng" }).click()

  await expect(page.getByText("Không tìm thấy phòng với mã này")).toBeVisible()
})

test("trang phòng không tồn tại hiện trạng thái không tìm thấy (không phải loading)", async ({
  page,
}) => {
  await page.goto("/rooms/ZZZZZZ")
  await expect(page.getByText("Không tìm thấy phòng", { exact: true })).toBeVisible()
  await expect(page.getByText("Đang tải phòng…")).toHaveCount(0)
})
