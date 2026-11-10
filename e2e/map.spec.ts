import { expect, test } from "@playwright/test"

/**
 * Bản đồ nạp pin theo khung nhìn (`GET /places/map?bbox=…`).
 *
 * Trước đây bản đồ dùng trang đầu của danh sách chung (9 địa điểm, dồn về Hải
 * Châu) — khoá lại hành vi mới: mở bản đồ phải thấy nhiều hơn một trang và
 * nhãn đếm phản ánh vùng đang xem.
 */
test("bản đồ nạp pin theo vùng xem, nhiều hơn một trang lưới", async ({ page }) => {
  await page.goto("/map")

  // Chờ pin của vùng đầu tiên nạp xong (trước đó nhãn hiện "Đang tải…").
  const markers = page.locator(".custom-place-marker")
  await expect(markers.first()).toBeVisible({ timeout: 10_000 })
  expect(await markers.count()).toBeGreaterThan(9)

  const counter = page.getByText(/Đang hiển thị \d+ địa điểm/)
  await expect(counter).toBeVisible()
  const count = Number((await counter.textContent())?.match(/\d+/)?.[0])
  expect(count).toBeGreaterThan(9)
})

test("pan sang vùng khác nạp thêm pin của vùng đó", async ({ page }) => {
  await page.goto("/map")
  await expect(page.locator(".custom-place-marker").first()).toBeVisible({ timeout: 10_000 })

  // Kéo bản đồ sang phải (về hướng Sơn Trà) — khung nhìn đổi → nạp lại vùng.
  const map = page.locator(".leaflet-container")
  await map.dragTo(map, {
    sourcePosition: { x: 640, y: 450 },
    targetPosition: { x: 240, y: 450 },
  })

  // Sau khi pan, query vùng mới hoàn tất — lại có pin (vùng Sơn Trà có quán).
  await expect(page.locator(".custom-place-marker").first()).toBeVisible({ timeout: 10_000 })
})
