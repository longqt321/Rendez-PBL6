import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { PasswordInput } from "./password-input"

describe("PasswordInput", () => {
  it("mặc định che mật khẩu, nút có aria-label và aria-pressed", () => {
    render(<PasswordInput id="pw" autoComplete="current-password" />)
    const input = document.getElementById("pw")!
    expect(input).toHaveAttribute("type", "password")

    const toggle = screen.getByRole("button", { name: "Hiện mật khẩu" })
    expect(toggle).toHaveAttribute("aria-pressed", "false")
  })

  it("bấm nút hiện rồi ẩn mật khẩu, đổi type và aria tương ứng", async () => {
    const user = userEvent.setup()
    render(<PasswordInput id="pw" autoComplete="new-password" />)

    const input = document.getElementById("pw")!
    const toggle = screen.getByRole("button", { name: "Hiện mật khẩu" })

    await user.click(toggle)
    expect(input).toHaveAttribute("type", "text")
    expect(screen.getByRole("button", { name: "Ẩn mật khẩu" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )

    await user.click(screen.getByRole("button", { name: "Ẩn mật khẩu" }))
    expect(input).toHaveAttribute("type", "password")
    expect(screen.getByRole("button", { name: "Hiện mật khẩu" })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
  })

  it("nhận các props input như autoComplete và register của react-hook-form", () => {
    render(<PasswordInput id="pw" autoComplete="new-password" defaultValue="matkhau" />)
    expect(document.getElementById("pw")).toHaveValue("matkhau")
  })
})
