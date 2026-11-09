import { expect, test } from "@playwright/test"

/**
 * Cài đặt hồ sơ: sửa tên → lưu → server (mock) xác nhận.
 *
 * Mock giữ dữ liệu trong bộ nhớ nên reload trang sẽ reset; test chỉ kiểm trong
 * cùng phiên — đúng hành vi hiện tại của adapter.
 */
test("lưu cài đặt hồ sơ và thấy toast xác nhận", async ({ page }) => {
  await page.goto("/settings")

  const nameInput = page.getByLabel("Tên hiển thị")
  await expect(nameInput).toBeVisible()
  await nameInput.fill("Minh Anh Test")

  await page.getByRole("button", { name: "Lưu thay đổi" }).click()
  await expect(page.getByText("Đã lưu thay đổi hồ sơ.")).toBeVisible()

  // Giá trị mới vẫn nằm trong form sau khi server trả về.
  await expect(nameInput).toHaveValue("Minh Anh Test")
})

test("tên quá ngắn bị chặn ngay ở form", async ({ page }) => {
  await page.goto("/settings")

  await page.getByLabel("Tên hiển thị").fill("A")
  await page.getByRole("button", { name: "Lưu thay đổi" }).click()

  await expect(page.getByText("Tên cần ít nhất 2 ký tự")).toBeVisible()
})
