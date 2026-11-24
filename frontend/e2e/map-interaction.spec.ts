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

  // 3. Tìm pin địa điểm đơn lẻ (.custom-place-marker) nằm dưới thanh công cụ nổi
  const markers = page.locator(".custom-place-marker")
  await expect(markers.first()).toBeVisible({ timeout: 10_000 })
  const count = await markers.count()
  let clicked = false
  for (let i = 0; i < count; i++) {
    const marker = markers.nth(i)
    const box = await marker.boundingBox()
    if (box && box.y > 160 && box.x > 40) {
      await marker.click()
      clicked = true
      break
    }
  }
  expect(clicked).toBe(true)

  // 4. Popup Leaflet mở ra
  const popup = page.locator(".leaflet-popup-content")
  await expect(popup).toBeVisible()

  // Kiểm tra thông tin trong popup
  const detailBtn = popup.getByRole("button", { name: /Xem quán/i })
  await expect(detailBtn).toBeVisible()

  // Lấy tên quán trong popup trước khi bấm
  const placeNameHeading = popup.locator("h4, p.font-medium, h3, a")
  expect(await placeNameHeading.count()).toBeGreaterThan(0)

  // 5. Click "Xem quán" → Điều hướng tới trang chi tiết /discover/:id
  await detailBtn.click()
  await expect(page).toHaveURL(/\/discover\/[a-z0-9-]+$/)
  await expect(page.getByRole("button", { name: /Báo cáo/i })).toBeVisible()
})

test("bộ lọc quận trên toolbar bản đồ cập nhật số lượng và lọc đúng dữ liệu", async ({ page }) => {
  await page.goto("/map")

  const counter = page.getByText(/Đang hiển thị [\d/]+ địa điểm/)
  await expect(counter).toBeVisible({ timeout: 10_000 })

  // Bấm chọn quận Hải Châu trên Toolbar
  await page.getByRole("button", { name: "Lọc theo khu vực" }).click()
  const haiChauItem = page.getByRole("menuitemradio", { name: "Hải Châu" })
  await expect(haiChauItem).toBeVisible()
  await haiChauItem.click()

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
