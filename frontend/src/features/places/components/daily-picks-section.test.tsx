import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { describe, expect, it, vi } from "vitest"
import { DailyPicksSection } from "./daily-picks-section"
import type { DailyPicks, Place } from "../types/place"

const state = vi.hoisted(() => ({
  value: {} as {
    data?: DailyPicks
    isPending: boolean
    isError: boolean
  },
}))

vi.mock("../hooks/use-daily-picks", () => ({
  useDailyPicks: () => state.value,
}))

const PLACE: Place = {
  id: "banh-xeo-ba-duong",
  name: "Bánh Xèo Bà Dưỡng",
  address: "K280/23 Hoàng Diệu",
  city: "Đà Nẵng",
  category: "restaurant",
  tags: [],
  positiveRatio: 90,
  reviewCount: 10,
  priceLevel: 2,
  imageHeight: 320,
  publishedAt: "2026-11-09T08:00:00+07:00",
}

const PICKS: DailyPicks = {
  date: "2026-11-12",
  items: [
    { place: PLACE, reason: "Quán mới" },
    { place: { ...PLACE, id: "place-2", name: "Quán Hai" }, reason: "Nhiều đánh giá" },
    { place: { ...PLACE, id: "place-3", name: "Quán Ba" }, reason: "Gợi ý của ngày" },
  ],
}

function renderSection() {
  return render(
    <MemoryRouter>
      <DailyPicksSection />
    </MemoryRouter>,
  )
}

describe("DailyPicksSection", () => {
  it("đang tải → hiện heading + 3 skeleton, không có card", () => {
    state.value = { isPending: true, isError: false }
    renderSection()

    expect(screen.getByRole("heading", { level: 2, name: /Gợi ý hôm nay/u })).toBeInTheDocument()
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0)
  })

  it("rỗng → không render gì (kể cả heading)", () => {
    state.value = { isPending: false, isError: false, data: { date: "2026-11-12", items: [] } }
    const { container } = renderSection()

    expect(container).toBeEmptyDOMElement()
  })

  it("lỗi → không render gì, không chặn trang", () => {
    state.value = { isPending: false, isError: true }
    const { container } = renderSection()

    expect(container).toBeEmptyDOMElement()
  })

  it("có dữ liệu → heading kèm ngày + 3 card kèm lý do", () => {
    state.value = { isPending: false, isError: false, data: PICKS }
    renderSection()

    const heading = screen.getByRole("heading", { level: 2, name: /Gợi ý hôm nay/u })
    expect(heading).toHaveTextContent("Gợi ý hôm nay · Thứ Năm, 12/11")
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3)
    expect(screen.getByText("Quán mới")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Bánh Xèo Bà Dưỡng" })).toHaveAttribute(
      "href",
      "/discover/banh-xeo-ba-duong",
    )
  })

  it("bấm card gợi ý → điều hướng tới trang quán", async () => {
    state.value = { isPending: false, isError: false, data: PICKS }
    const user = userEvent.setup()
    renderSection()

    // Tracking analytics thật chưa có (BACKLOG) — card chỉ cần điều hướng đúng.
    await user.click(screen.getByRole("link", { name: "Quán Hai" }))

    expect(screen.getByRole("link", { name: "Quán Hai" })).toHaveAttribute(
      "href",
      "/discover/place-2",
    )
  })
})
