import { expect, test, type Page } from "@playwright/test"

/**
 * Nút "Chia sẻ" trên 2 trang chi tiết (docs/thiet-ke/chia-se-og-dong.md §7).
 *
 * Chromium desktop không có `navigator.share` nên `shareLink` rơi về clipboard.
 * Stub `navigator.clipboard` để không phụ thuộc quyền clipboard của trình duyệt
 * và để kiểm được đúng URL đã sao chép — toast chỉ là hệ quả.
 */
async function stubShareFallback(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true })
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (text: string) => {
          ;(window as unknown as { __copiedUrl?: string }).__copiedUrl = text
          return Promise.resolve()
        },
      },
    })
  })
}

/** Bấm nút "Chia sẻ" và xác nhận toast + URL đã sao chép. */
async function shareAndExpectCopied(page: Page, expectedPath: string): Promise<void> {
  const button = page.getByRole("button", { name: "Chia sẻ" })
  await expect(button).toBeVisible()
  await button.click()

  await expect(page.getByText("Đã sao chép liên kết")).toBeVisible()

  const copied = await page.evaluate(
    () => (window as unknown as { __copiedUrl?: string }).__copiedUrl ?? null,
  )
  expect(copied).not.toBeNull()
  expect(new URL(copied!).pathname).toBe(expectedPath)
}

test("trang chi tiết quán có nút Chia sẻ → sao chép liên kết", async ({ page }) => {
  await stubShareFallback(page)
  await page.goto("/discover")

  await page.getByRole("heading", { level: 3 }).first().getByRole("link").click()
  await expect(page).toHaveURL(/\/discover\/[^/]+$/u)

  const path = new URL(page.url()).pathname
  await shareAndExpectCopied(page, path)
})

test("trang chi tiết bài đăng có nút Chia sẻ → sao chép liên kết", async ({ page }) => {
  await stubShareFallback(page)
  await page.goto("/social")

  // Cold-start không seed bài đăng — tự đăng qua composer như `social.spec.ts`.
  const composer = page.getByRole("textbox", { name: "Nội dung bài đăng" })
  await composer.fill("Bài kiểm tra e2e nút chia sẻ")
  await page.getByRole("button", { name: "Đăng", exact: true }).click()
  await expect(composer).toHaveValue("")

  await page.locator('a[href^="/post/"]').first().click()
  await expect(page).toHaveURL(/\/post\/[^/]+$/u)

  const path = new URL(page.url()).pathname
  await shareAndExpectCopied(page, path)
})
