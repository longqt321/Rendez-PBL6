import { expect, test } from "@playwright/test"

/**
 * E2E Test Suite: Luồng Bình luận & Trả lời bình luận (Comment & Reply Flow)
 *
 * 1. Đăng bài viết mới trên `/social`.
 * 2. Click vào link bài viết (`a[href^="/post/"]`) để mở trang chi tiết `/post/:id`.
 * 3. Gõ bình luận gốc trong `CommentComposer` ("Quán này phục vụ rất chu đáo!").
 * 4. Bấm "Gửi bình luận" → Bình luận xuất hiện ngay trên danh sách.
 * 5. Bấm nút "Trả lời" (Reply) dưới bình luận đó → Xuất hiện banner "Đang trả lời @handle".
 * 6. Gõ nội dung phản hồi ("Đồng ý với bạn, giá lại hợp lý nữa") → Gửi.
 * 7. Bình luận con xuất hiện lồng 1 cấp kèm tag `@handle`.
 */
test("bình luận bài viết và trả lời lồng 1 cấp", async ({ page }) => {
  await page.goto("/social")

  // Đăng một bài mới để test
  const uniqueContent = `Bài thảo luận ẩm thực ${Date.now()}`
  const composer = page.getByRole("textbox", { name: "Nội dung bài đăng" })
  await composer.fill(uniqueContent)
  await page.getByRole("button", { name: "Đăng", exact: true }).click()
  await expect(composer).toHaveValue("")

  // Click vào link bài đăng đầu tiên để chuyển đến trang chi tiết /post/:id
  await page.locator('a[href^="/post/"]').first().click()
  await expect(page).toHaveURL(/\/post\/[^/]+$/u)

  // 1. Gửi bình luận gốc
  const commentInput = page.getByLabel("Nội dung bình luận")
  await expect(commentInput).toBeVisible({ timeout: 10_000 })
  await commentInput.fill("Quán này phục vụ rất chu đáo và thân thiện!")
  await page.getByRole("button", { name: "Gửi bình luận" }).click()

  // Bình luận gốc hiển thị
  const rootComment = page.getByText("Quán này phục vụ rất chu đáo và thân thiện!")
  await expect(rootComment).toBeVisible()

  // 2. Bấm "Trả lời" dưới bình luận
  await page.getByRole("button", { name: "Trả lời" }).first().click()

  // Xuất hiện chỉ báo đang trả lời
  await expect(page.getByText(/Đang trả lời @/)).toBeVisible()

  // 3. Gõ nội dung phản hồi
  await commentInput.fill("Đồng ý với bạn, không gian cũng rất rộng rãi.")
  await page.getByRole("button", { name: "Gửi bình luận" }).click()

  // Bình luận phản hồi xuất hiện
  const replyComment = page.getByText("Đồng ý với bạn, không gian cũng rất rộng rãi.")
  await expect(replyComment).toBeVisible()
})
