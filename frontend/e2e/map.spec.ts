import { expect, test } from "@playwright/test"

/**
 * Bản đồ nạp pin theo khung nhìn (`GET /places/map?bbox=…`).
 *
 * Trước đây bản đồ dùng trang đầu của danh sách chung (9 địa điểm, dồn về Hải
 * Châu) — khoá lại hành vi mới: mở bản đồ phải thấy nhiều hơn một trang và
 * nhãn đếm phản ánh vùng đang xem.
 *
 * Pin giờ được gom cụm (supercluster) nên "thứ nhìn thấy" gồm cả pin lẻ
 * (`.custom-place-marker`) lẫn cụm (`.place-cluster-marker`).
 */
const VISIBLE_MARKERS = ".custom-place-marker, .place-cluster-marker"

test("bản đồ nạp pin theo vùng xem, nhiều hơn một trang lưới", async ({ page }) => {
  await page.goto("/map")

  // Chờ pin của vùng đầu tiên nạp xong (trước đó nhãn hiện "Đang tải…").
  const markers = page.locator(VISIBLE_MARKERS)
  await expect(markers.first()).toBeVisible({ timeout: 10_000 })
  expect(await markers.count()).toBeGreaterThan(9)

  const counter = page.getByText(/Đang hiển thị [\d/]+ địa điểm/)
  await expect(counter).toBeVisible()
  const count = Number((await counter.textContent())?.match(/\d+/)?.[0])
  expect(count).toBeGreaterThan(9)
})

test("vùng đông quán được gom cụm, bấm cụm để phóng to", async ({ page }) => {
  await page.goto("/map")
  await expect(page.locator(VISIBLE_MARKERS).first()).toBeVisible({ timeout: 10_000 })

  // Ở zoom mở bản đồ (13), hàng trăm quán Đà Nẵng phải gom thành cụm có số.
  const clusters = page.locator(".place-cluster-marker")
  await expect(clusters.first()).toBeVisible()

  // Đọc zoom hiện tại từ URL tile OSM (`…/{z}/{x}/{y}.png`) — Leaflet không
  // gắn instance map vào DOM nên đây là tín hiệu zoom quan sát được từ ngoài.
  const tileZoom = async () => {
    const src = await page.locator(".leaflet-tile-pane img").first().getAttribute("src")
    return Number(src?.match(/\/(\d+)\/\d+\/\d+\.png/)?.[1])
  }
  const zoomBefore = await tileZoom()
  expect(zoomBefore).toBeGreaterThan(0)

  await clusters.first().click()

  // Bấm cụm → bay tới mức zoom cụm tách ra (zoom tăng).
  await expect.poll(tileZoom, { timeout: 10_000 }).toBeGreaterThan(zoomBefore)
})

test("pan sang vùng khác nạp lại pin của vùng đó", async ({ page }) => {
  await page.goto("/map")
  await expect(page.locator(VISIBLE_MARKERS).first()).toBeVisible({ timeout: 10_000 })

  // Nhãn đếm phản ánh vùng đang xem — ghi lại giá trị trước khi pan.
  const counter = page.getByText(/Đang hiển thị [\d/]+ địa điểm/)
  const before = await counter.textContent()

  // Kéo bản đồ sang phải (về hướng Sơn Trà) — khung nhìn đổi → nạp lại vùng.
  const map = page.locator(".leaflet-container")
  await map.dragTo(map, {
    sourcePosition: { x: 640, y: 450 },
    targetPosition: { x: 240, y: 450 },
  })

  // Nhãn đếm PHẢI đổi giá trị — chứng tỏ vùng mới được nạp (chỉ assert "vẫn còn
  // pin" là chưa đủ: pin cũ vẫn hiển thị dù không fetch gì).
  await expect(counter).not.toHaveText(before ?? "", { timeout: 10_000 })
  await expect(page.locator(VISIBLE_MARKERS).first()).toBeVisible()
})
