import { expect, test } from "@playwright/test"

/**
 * Mini-map mount lười (D-054): bản đồ trang chi tiết chỉ dựng khi cuộn tới —
 * không mount là không tải tile OSM. Kiểm tra bằng DOM: `.leaflet-container`
 * phải vắng mặt trước khi cuộn và xuất hiện sau khi cuộn tới.
 */
test("mini-map chỉ mount khi cuộn tới", async ({ page }) => {
  // Viewport thấp để mini-map nằm dưới màn hình — buộc phải cuộn tới.
  await page.setViewportSize({ width: 1280, height: 420 })
  await page.goto("/discover/banh-xeo-ba-duong")
  await page.waitForLoadState("networkidle")

  // Chưa cuộn: mini-map chưa mount (khung giữ chỗ vẫn có, đúng chiều cao).
  const miniMapFrame = page.locator(".place-mini-map-frame")
  await expect(miniMapFrame).toBeAttached()
  await expect(miniMapFrame.locator(".leaflet-container")).toHaveCount(0)

  // Cuộn tới: bản đồ mount.
  await miniMapFrame.scrollIntoViewIfNeeded()
  await expect(miniMapFrame.locator(".leaflet-container")).toBeVisible({ timeout: 10_000 })
})
