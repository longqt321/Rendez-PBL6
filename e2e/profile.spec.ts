import { expect, test } from "@playwright/test"

/**
 * Nút "Nhắn tin" chưa có backend nên tắt, nhưng phải giải thích được lý do.
 *
 * Nút `disabled` không phát pointer event — tooltip chỉ hiện khi trigger được bọc
 * phần tử nhận hover. Test này khoá lại hành vi đó (trước đây tooltip không bao
 * giờ hiện).
 */
test("nút Nhắn tin tắt nhưng hover vẫn hiện giải thích", async ({ page }) => {
  await page.goto("/u/bao.an.day")

  const button = page.getByRole("button", { name: "Nhắn tin" })
  await expect(button).toBeDisabled()

  // Hover phần bọc span (mục tiêu hover thật của người dùng): Playwright từ chối
  // hover trực tiếp nút disabled vì hit-target check.
  await button.locator("..").hover()
  await expect(page.getByText("Tính năng nhắn tin sẽ mở khi backend hoàn thiện")).toBeVisible()
})
