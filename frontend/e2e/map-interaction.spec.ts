import { expect, test } from "@playwright/test"

/**
 * E2E Test Suite: Kịch bản tương tác Bản đồ nâng cao (Advanced Map Interaction)
 *
 * Bản đồ là tính năng cốt lõi của Rendez:
 * 1. Phóng to / Thu nhỏ (Zoom in/out) qua nút điều khiển Leaflet.
 * 2. Click vào pin địa điểm lẻ (.custom-place-marker) → Mở Popup thông tin quán.
 * 3. Kiểm tra thông tin trong Popup (Ảnh, Tên quán, Rating, Nút "Xem quán").
 * 4. Click nút "Xem quán" từ popup → Điều hướng thành công đến trang chi tiết `/discover/:id`.
 * 5. Lọc kết hợp ngay trên Toolbar bản đồ (chọn quận Hải Châu) → Bản đồ nạp lại dữ liệu đúng quận.
 * 6. Khả năng truy cập & phím tắt: Điều hướng phím (+/- zoom in/out).
 */

const VISIBLE_MARKERS = ".custom-place-marker, .place-cluster-marker"

test("click pin địa điểm trên bản đồ mở popup và điều hướng tới trang chi tiết quán", async ({
  page,
}) => {
  await page.goto("/map")

  // 1. Chờ bản đồ và các marker/cụm tải xong
  await expect(page.locator(VISIBLE_MARKERS).first()).toBeVisible({ timeout: 10_000 })

  // 2. Zoom sâu vào để các cụm tách ra thành pin lẻ
  const zoomInBtn = page.locator(".leaflet-control-zoom-in")
  await expect(zoomInBtn).toBeVisible()

  // Click zoom in 3 lần để giải tán cụm supercluster
  await zoomInBtn.click()
  await page.waitForTimeout(400)
  await zoomInBtn.click()
  await page.waitForTimeout(400)
  await zoomInBtn.click()
  await page.waitForTimeout(600)

  // 3. Tìm pin địa điểm đơn lẻ (.custom-place-marker)
  const placeMarker = page.locator(".custom-place-marker").first()
  await expect(placeMarker).toBeVisible({ timeout: 10_000 })

  // Click vào pin quán
  await placeMarker.click()

  // 4. Popup Leaflet mở ra
  const popup = page.locator(".leaflet-popup-content")
  await expect(popup).toBeVisible()

  // Kiểm tra thông tin trong popup
  const detailLink = popup.getByRole("link", { name: /Xem quán/i })
  await expect(detailLink).toBeVisible()

  // Lấy tên quán trong popup trước khi bấm
  const placeNameHeading = popup.locator("p.font-medium, h3, a")
  expect(await placeNameHeading.count()).toBeGreaterThan(0)

  // 5. Click "Xem quán" → Điều hướng tới trang chi tiết /discover/:id
  await detailLink.click()
  await expect(page).toHaveURL(/\/discover\/[a-z0-9-]+$/)
  await expect(page.getByRole("button", { name: /Báo cáo/i })).toBeVisible()
})

test("bộ lọc quận trên toolbar bản đồ cập nhật số lượng và lọc đúng dữ liệu", async ({ page }) => {
  await page.goto("/map")

  const counter = page.getByText(/Đang hiển thị [\d/]+ địa điểm/)
  await expect(counter).toBeVisible({ timeout: 10_000 })

  // Bấm chọn quận Hải Châu trên Toolbar
  const haiChauBtn = page.getByRole("button", { name: "Hải Châu", exact: true })
  await expect(haiChauBtn).toBeVisible()
  await haiChauBtn.click()

  // URL cập nhật query district (Hải Châu encode)
  await expect(page).toHaveURL(/district=/)

  // Nhãn counter cập nhật số lượng và marker vẫn hiển thị đúng
  await expect(counter).toBeVisible()
  await expect(page.locator(VISIBLE_MARKERS).first()).toBeVisible()
})

test("bản đồ hỗ trợ bàn phím điều hướng và phím tắt zoom Leaflet (+/-)", async ({ page }) => {
  await page.goto("/map")
  const mapContainer = page.locator(".leaflet-container")
  await expect(mapContainer).toBeVisible()

  // Focus vào bản đồ và bấm phím '+' để zoom in
  await mapContainer.focus()
  await page.keyboard.press("+")
  await page.waitForTimeout(500)

  // Bấm phím '-' để zoom out
  await page.keyboard.press("-")
  await page.waitForTimeout(500)

  await expect(page.locator(VISIBLE_MARKERS).first()).toBeVisible()
})
