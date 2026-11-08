import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { RatingStars } from "./rating-stars"

describe("RatingStars", () => {
  it("chế độ hiển thị: aria-label mô tả điểm", () => {
    render(<RatingStars value={4} />)
    expect(screen.getByRole("img", { name: "Đánh giá 4 trên 5 sao" })).toBeInTheDocument()
  })

  it("chế độ nhập: bấm sao gọi onChange với đúng giá trị", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<RatingStars value={0} onChange={onChange} />)

    await user.click(screen.getByRole("radio", { name: "3 sao" }))
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it("chế độ nhập: 5 radio có vai trò và nhãn rõ ràng", () => {
    render(<RatingStars value={0} onChange={() => {}} />)
    for (const star of [1, 2, 3, 4, 5]) {
      expect(screen.getByRole("radio", { name: `${star} sao` })).toBeInTheDocument()
    }
  })
})
