import { expect, test } from "@playwright/test"

/**
 * E2E Test: Vòng đời Đánh giá địa điểm (Place Review Lifecycle)
 *
 * Kiểm thử luồng người dùng hoàn chỉnh:
 * 1. Mở trang chi tiết địa điểm (`/discover/banh-xeo-ba-duong`).
 * 2. Bấm "Viết đánh giá" → form xuất hiện.
 * 3. Chọn 5 sao, nhập nội dung cảm nhận vào textarea → Bấm "Gửi đánh giá".
 * 4. Toast xác nhận thành công hiển thị, card đánh giá của tôi xuất hiện.
 * 5. Bấm "Sửa đánh giá" → đổi số sao thành 4 sao và cập nhật nội dung.
 * 6. Bấm "Xoá" trên card đánh giá → mở dialog xác nhận → xác nhận xoá → đánh giá biến mất, nút "Viết đánh giá" quay trở lại.
 */
test("vòng đời đánh giá quán: viết mới → sửa → xoá đánh giá", async ({ page }) => {
  await page.goto("/discover/banh-xeo-ba-duong")

  // Chờ trang chi tiết tải xong
  await expect(page.getByRole("heading", { name: "Bánh xèo Bà Dưỡng" })).toBeVisible()

  // 1. Kiểm tra trạng thái ban đầu: Có nút "Viết đánh giá" hoặc nút "Sửa đánh giá"
  const writeReviewBtn = page.getByRole("button", { name: "Viết đánh giá" })

  if (await writeReviewBtn.isVisible()) {
    // 2. Viết đánh giá mới
    await writeReviewBtn.click()
    await expect(page.getByText("Chia sẻ trải nghiệm của bạn")).toBeVisible()

    // Chọn 5 sao
    await page.getByLabel("5 sao").click({ force: true })

    // Nhập nội dung vào textarea
    await page.locator("#review-content").fill("Bánh xèo giòn rụm, nước chấm đậm đà xuất sắc!")

    // Gửi đánh giá
    await page.getByRole("button", { name: "Gửi đánh giá" }).click()

    // Kiểm tra toast thành công
    await expect(page.getByText("Đã gửi đánh giá, cảm ơn bạn!")).toBeVisible()
  }

  // 3. Card đánh giá của tôi hiện ra kèm nút "Sửa đánh giá"
  const editBtn = page.getByRole("button", { name: "Sửa đánh giá" })
  await expect(editBtn).toBeVisible()
  await editBtn.click()

  // 4. Form sửa xuất hiện: đổi số sao sang 4 sao và sửa nội dung
  await expect(page.getByText("Đánh giá của bạn")).toBeVisible()
  await page.getByLabel("4 sao").click({ force: true })
  await page.locator("#review-content").fill("Đã quay lại lần 2, bánh xèo vẫn ngon nhưng hơi đông.")

  // Bấm "Cập nhật"
  await page.getByRole("button", { name: "Cập nhật" }).click()
  await expect(page.getByText("Đã cập nhật đánh giá")).toBeVisible()

  // 5. Card đánh giá cập nhật hiện ra: Bấm nút xoá có aria-label "Xoá đánh giá" trên card
  await page.getByRole("button", { name: "Xoá đánh giá" }).click()

  // Dialog xác nhận xoá hiển thị
  const confirmDialog = page.getByRole("alertdialog")
  await expect(confirmDialog).toBeVisible()
  await confirmDialog.getByRole("button", { name: "Xoá" }).click()

  // Toast xoá thành công
  await expect(page.getByText("Đã xoá đánh giá")).toBeVisible()

  // Nút "Viết đánh giá" hiển thị trở lại
  await expect(page.getByRole("button", { name: "Viết đánh giá" })).toBeVisible()
})
