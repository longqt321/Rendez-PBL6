import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Button } from "@/components/ui/button"
import { ErrorState } from "./error-state"

describe("ErrorState", () => {
  it("hiện tiêu đề và mô tả mặc định", () => {
    render(<ErrorState title="Không tải được bài đăng" />)
    expect(screen.getByText("Không tải được bài đăng")).toBeInTheDocument()
    expect(screen.getByText("Kiểm tra kết nối rồi thử lại.")).toBeInTheDocument()
  })

  it("có onRetry thì hiện nút thử lại và gọi lại đúng một lần", async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    render(<ErrorState title="Lỗi" onRetry={onRetry} />)

    await user.click(screen.getByRole("button", { name: "Thử lại" }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("không onRetry thì không có nút (vd 404)", () => {
    render(<ErrorState title="Không tìm thấy" description="Tài nguyên không tồn tại." />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("children đè nút thử lại khi cần hành động khác", () => {
    render(
      <ErrorState title="Không tìm thấy">
        <Button>Về trang Cộng đồng</Button>
      </ErrorState>,
    )
    expect(screen.getByRole("button", { name: "Về trang Cộng đồng" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Thử lại" })).not.toBeInTheDocument()
  })
})
