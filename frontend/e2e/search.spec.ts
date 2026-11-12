import { expect, test } from "@playwright/test"

/**
 * Tìm người + gợi ý theo dõi (tab "Người" của `/search`).
 *
 * Mock server trả 3 người dùng mẫu (`lananh.cafe`, `hieu.food`, `mai.nguyen`)
 * và route `GET /users/suggestions` lọc theo trạng thái follow trong bộ nhớ —
 * nhờ vậy kiểm được cả vòng "theo dõi xong thì gợi ý biến mất" mà không cần
 * chặn request (mock là axios adapter, không phải fetch).
 */

const peopleResults = (page: import("@playwright/test").Page) =>
  page.getByRole("list", { name: "Kết quả tìm kiếm người dùng" })

const suggestions = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Gợi ý theo dõi" })

// Kết quả tìm kiếm có nút theo dõi ngay trong hàng — bấm đổi trạng thái, bấm lại bỏ theo dõi.
test("tab Người: theo dõi rồi bỏ theo dõi ngay trong kết quả", async ({ page }) => {
  await page.goto("/search?q=lananh")
  await page.getByRole("tab", { name: "Người" }).click()

  const row = peopleResults(page).getByRole("listitem").first()
  await expect(row).toContainText("Lan Anh")

  await row.getByRole("button", { name: "Theo dõi", exact: true }).click()
  await expect(row.getByRole("button", { name: "Đang theo dõi" })).toBeVisible()

  await row.getByRole("button", { name: "Đang theo dõi" }).click()
  await expect(row.getByRole("button", { name: "Theo dõi", exact: true })).toBeVisible()
})

// Khối "Gợi ý theo dõi" hiện phía trên kết quả, có heading nhìn thấy được.
test("khối Gợi ý theo dõi hiện với dữ liệu mock", async ({ page }) => {
  await page.goto("/search?q=lananh")
  await page.getByRole("tab", { name: "Người" }).click()

  await expect(suggestions(page)).toBeVisible()
  await expect(
    suggestions(page).getByRole("heading", { level: 2, name: "Gợi ý theo dõi" }),
  ).toBeVisible()
  await expect(suggestions(page).getByRole("listitem").first()).toBeVisible()
})

// Theo dõi hết người được gợi ý → endpoint lọc sạch, khối tự biến mất.
test("theo dõi hết gợi ý → khối biến mất", async ({ page }) => {
  await page.goto("/search?q=lananh")
  await page.getByRole("tab", { name: "Người" }).click()
  // Chờ dữ liệu gợi ý về (mock trễ ~320ms) — skeleton cũng "visible".
  await expect(suggestions(page).getByRole("listitem").first()).toBeVisible()

  for (let index = 0; index < 5; index += 1) {
    const button = suggestions(page).getByRole("button", { name: "Theo dõi", exact: true }).first()
    if ((await button.count()) === 0) break
    await button.click()
    // Chờ invalidate `["users"]` + mock trả lời (RESPONSE_DELAY_MS 320ms).
    await page.waitForTimeout(500)
  }

  await expect(suggestions(page)).toBeHidden()
})

// Guest bấm theo dõi → điều hướng trang đăng nhập kèm `next` (V6-03: không im lặng).
test("guest bấm theo dõi → về /login kèm next", async ({ page }) => {
  await page.goto("/discover")
  const menuButton = page.getByRole("button", { name: "Mở menu người dùng" })
  await menuButton.click()
  await page.getByRole("menuitem", { name: "Đăng xuất" }).click()
  // Avatar đổi sang icon khách khi `GET /me` trả 401 — tín hiệu đã đăng xuất.
  await expect(menuButton.locator("svg.lucide-user")).toBeVisible()

  // Điều hướng SPA (KHÔNG `goto` — mock reset phiên khi tải lại trang) qua ô
  // tìm kiếm ở topbar: gõ từ khoá rồi Enter.
  const searchBox = page.getByRole("searchbox", { name: "Tìm kiếm" })
  await searchBox.fill("lananh")
  await searchBox.press("Enter")
  await page.getByRole("tab", { name: "Người" }).click()

  // Guest không thấy khối gợi ý (endpoint cần đăng nhập).
  await expect(suggestions(page)).toBeHidden()

  await peopleResults(page).getByRole("button", { name: "Theo dõi", exact: true }).first().click()
  await expect(page).toHaveURL(/\/login\?next=%2Fsearch%3Fq%3Dlananh/u)
})
