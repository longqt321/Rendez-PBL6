import { expect, test } from "@playwright/test"

/**
 * Ngân sách ảnh của `/discover` (thiết kế mục 5.5 / V6-04).
 *
 * Đo bằng `PerformanceResourceTiming.transferSize` qua `page.evaluate` — KHÔNG
 * dùng `page.on("response")` vì response không có `transferSize`. Chạy trên
 * dev server (mock) là đủ để chặn hồi quy: ảnh card phải là biến thể WebP, tổng
 * tải ảnh phải dưới ngưỡng (trước khi có srcset: ~2,6 MB cho 9 card).
 */
test("cold load /discover: ảnh card là .webp và tổng transfer ảnh < 1,5 MB", async ({ page }) => {
  // Dev server Vite tải >250 module ESM riêng lẻ, tràn buffer 250 mặc định của ResourceTiming.
  await page.addInitScript(() => {
    performance.setResourceTimingBufferSize(2000)
  })
  await page.goto("/discover")
  // Chờ lưới card có ảnh thật (bỏ qua skeleton).
  await expect(page.locator('img[alt^="Ảnh "]').first()).toBeVisible()

  // Cuộn hết một màn để ảnh lazy trong khung nhìn được tải.
  await page.mouse.wheel(0, 1200)
  await page.waitForLoadState("networkidle")

  const images = await page.evaluate(() => {
    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[]
    const imgs = entries.filter((entry) => entry.initiatorType === "img")
    return {
      totalBytes: imgs.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
      urls: imgs.map((entry) => entry.name),
    }
  })

  // Card phải tải biến thể WebP, không phải ảnh gốc 1200px.
  expect(images.urls.length).toBeGreaterThan(0)
  for (const url of images.urls) {
    expect(url).toMatch(/-(400|800)\.webp$/u)
  }

  expect(images.totalBytes).toBeLessThan(1.5 * 1024 * 1024)

  // `srcset` phải có ≥ 2 ứng viên (400w/800w/gốc) để trình duyệt chọn đúng cỡ.
  const srcset = await page.locator('img[alt^="Ảnh "]').first().getAttribute("srcset")
  expect(srcset?.split(",").length ?? 0).toBeGreaterThanOrEqual(2)
})
