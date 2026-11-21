import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import type { DailyPickWhy, Place } from "../types/place"
import { PlaceCard } from "./place-card"

const BASE_PLACE: Place = {
  id: "ca-phe-pho",
  name: "Cà Phê Phố",
  address: "12 Trần Phú, Hải Châu",
  city: "Đà Nẵng",
  category: "cafe",
  tags: ["yên tĩnh", "cà phê"],
  rating: 4.7,
  reviewCount: 15,
  priceLevel: 1,
  imageHeight: 300,
  publishedAt: "2026-11-10T08:00:00+07:00",
}

const SAMPLE_WHY: DailyPickWhy = {
  matchPercent: 86,
  district: "Hải Châu",
  openNow: true,
  distanceKm: null,
  signals: ["Hợp gu cà phê", "Đang mở cửa"],
}

describe("PlaceCard", () => {
  it("hiển thị nhãn lý do gợi ý tự nhiên, không hiện Điểm gợi ý x/100", () => {
    render(
      <MemoryRouter>
        <PlaceCard place={BASE_PLACE} why={SAMPLE_WHY} />
      </MemoryRouter>,
    )

    expect(screen.getByText("Hợp gu cà phê")).toBeInTheDocument()
    expect(screen.getByText("Đang mở cửa")).toBeInTheDocument()
    expect(screen.queryByText(/Điểm gợi ý/u)).not.toBeInTheDocument()
    expect(screen.queryByText(/\/100/u)).not.toBeInTheDocument()
  })

  it("ẩn khối lý do khi signals rỗng", () => {
    render(
      <MemoryRouter>
        <PlaceCard
          place={BASE_PLACE}
          why={{
            matchPercent: 70,
            district: "Hải Châu",
            openNow: null,
            distanceKm: null,
            signals: [],
          }}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByLabelText("Vì sao gợi ý")).not.toBeInTheDocument()
  })
})
