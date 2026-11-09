import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { ReportPlaceDialog } from "./report-place-dialog"
import type { Place } from "../types/place"

const PLACE: Place = {
  id: "p-01",
  name: "Bánh Xèo Bà Dưỡng",
  address: "K280/23 Hoàng Diệu",
  city: "Đà Nẵng",
  category: "restaurant",
  tags: [],
  rating: 4.8,
  reviewCount: 10,
  priceLevel: 2,
  imageSeed: "seed",
  imageHeight: 320,
}

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ReportPlaceDialog place={PLACE}>
        <button type="button">Báo cáo</button>
      </ReportPlaceDialog>
    </QueryClientProvider>,
  )
}

describe("ReportPlaceDialog", () => {
  it("mở dialog hiển thị đủ 4 lý do báo cáo", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole("button", { name: "Báo cáo" }))
    for (const label of ["Quán đã đóng cửa", "Thông tin sai", "Trùng địa điểm", "Lý do khác"]) {
      expect(screen.getByRole("radio", { name: new RegExp(label) })).toBeInTheDocument()
    }
  })

  it("chọn 'Lý do khác' mà không mô tả → chặn gửi với lỗi rõ ràng", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole("button", { name: "Báo cáo" }))
    await user.click(screen.getByRole("radio", { name: /Lý do khác/ }))
    await user.click(screen.getByRole("button", { name: /Gửi báo cáo/ }))

    expect(await screen.findByText("Mô tả cụ thể lý do báo cáo")).toBeInTheDocument()
  })

  it("gửi báo cáo 'đóng cửa' thành công → dialog đóng, form reset", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole("button", { name: "Báo cáo" }))
    await user.click(screen.getByRole("radio", { name: /Quán đã đóng cửa/ }))
    await user.click(screen.getByRole("button", { name: /Gửi báo cáo/ }))

    // Mock server ghi nhận báo cáo → component đóng dialog.
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Gửi báo cáo/ })).not.toBeInTheDocument(),
    )
  })
})
