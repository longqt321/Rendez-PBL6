import { expect, test } from "@playwright/test"

/**
 * E2E Test Suite: Quản trị & Vòng đời Rời phòng lọc nhóm (Leave Room Lifecycle)
 *
 * 1. Mở trang /discover, tạo một phòng lọc nhóm mới.
 * 2. Mở phòng → banner phòng xuất hiện và trang chi tiết `/rooms/:code` hiển thị.
 * 3. Bấm nút "Rời phòng".
 * 4. Toast "Đã rời phòng" hiển thị.
 * 5. Quay lại trang `/discover` → Banner phòng nhóm không còn hiển thị.
 */
test("thành viên rời phòng lọc nhóm thành công và dọn dẹp trạng thái", async ({ page }) => {
  await page.goto("/discover")

  // Tạo phòng mới
  await page.getByRole("button", { name: "Đi cùng nhóm" }).click()
  const roomName = `Nhóm e2e rời phòng ${Date.now()}`
  await page.getByLabel("Tạo phòng mới").fill(roomName)
  await page.getByRole("button", { name: "Tạo phòng", exact: true }).click()
  await expect(page.getByText(/Đã tạo phòng/u)).toBeVisible()

  // Mở phòng
  await page.getByRole("link", { name: "Mở phòng" }).click()
  await expect(page).toHaveURL(/\/rooms\/[0-9A-HJKMNP-TV-Z]{6}$/u)

  // Bấm "Rời phòng"
  const leaveBtn = page.getByRole("button", { name: "Rời phòng" })
  await expect(leaveBtn).toBeVisible()
  await leaveBtn.click()

  // Toast xác nhận đã rời phòng xuất hiện
  await expect(page.getByText("Đã rời phòng")).toBeVisible()

  // Quay lại trang /discover kiểm tra banner phòng đã biến mất
  await page.goto("/discover")
  await expect(page.getByRole("link", { name: "Mở phòng" })).not.toBeVisible()
})
