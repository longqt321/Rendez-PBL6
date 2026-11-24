import { expect, test } from "@playwright/test"

/**
 * Trang cá nhân của chính mình.
 *
 * Trước đây test này vào `/u/:handle` của một tài khoản mẫu để thấy nút
 * "Nhắn tin" tắt kèm tooltip. Cold-start không còn tài khoản ảo nào (quyết định
 * D-049), nên không còn hồ sơ người khác để xem — test chuyển sang khoá hành vi
 * còn kiểm được: hồ sơ của mình hiển thị "Sửa hồ sơ" (không có nút "Nhắn tin").
 */
test("hồ sơ của tôi có nút Sửa hồ sơ thay cho Nhắn tin", async ({ page }) => {
  await page.goto("/profile")

  await expect(page.getByRole("button", { name: "Chỉnh sửa hồ sơ" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Nhắn tin" })).toHaveCount(0)
})
