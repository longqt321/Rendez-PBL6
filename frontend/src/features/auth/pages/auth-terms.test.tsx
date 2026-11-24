import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NuqsAdapter } from "nuqs/adapters/react-router/v8"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LoginPage } from "./login-page"
import { RegisterPage } from "./register-page"
import { TermsPage } from "@/features/static/pages/terms-page"

const registerMutate = vi.fn()
const loginMutate = vi.fn()

vi.mock("@/features/profile/hooks/use-me", () => ({
  useMe: () => ({ data: undefined, isPending: false, isError: true }),
}))

vi.mock("../hooks/use-auth-providers", () => ({
  useAuthProviders: () => ({ data: { providers: [] } }),
}))

vi.mock("../hooks/use-register", () => ({
  useRegister: () => ({ mutate: registerMutate, isPending: false, isError: false }),
}))

vi.mock("../hooks/use-login", () => ({
  useLogin: () => ({ mutate: loginMutate, isPending: false, isError: false }),
}))

vi.mock("../hooks/use-send-verification-email", () => ({
  useSendVerificationEmail: () => ({ mutate: vi.fn(), isPending: false, isSuccess: false }),
}))

function renderWithProviders(ui: React.ReactElement, path = "/register") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <NuqsAdapter>{ui}</NuqsAdapter>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("Terms visibility and registration enforcement", () => {
  beforeEach(() => {
    window.localStorage.clear()
    registerMutate.mockReset()
    loginMutate.mockReset()
  })

  it("chặn đăng ký nếu chưa đồng ý Điều khoản sử dụng và cho mở xem điều khoản ngay tại form", async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />, "/register")

    await user.type(screen.getByLabelText("Tên hiển thị"), "Minh Anh")
    await user.type(screen.getByLabelText("Email"), "minhanh@rendez.local")
    await user.type(screen.getByLabelText("Tên người dùng"), "minhanh_dn")
    await user.type(screen.getByLabelText("Mật khẩu"), "password123")
    await user.type(screen.getByLabelText("Nhập lại mật khẩu"), "password123")

    await user.click(screen.getByRole("button", { name: "Đăng ký" }))
    expect(registerMutate).not.toHaveBeenCalled()
    expect(
      screen.getByText(/Bạn cần đồng ý Điều khoản sử dụng để đăng ký tài khoản/u),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Điều khoản sử dụng" }))
    expect(screen.getByText(/Điều khoản sử dụng Rendez/u)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Tôi đồng ý điều khoản" }))
    await user.click(screen.getByRole("button", { name: "Đăng ký" }))

    expect(registerMutate).toHaveBeenCalledWith(
      expect.objectContaining({ acceptTerms: true }),
      expect.any(Object),
    )
  })

  it("hiển thị thông báo Điều khoản sử dụng ở lần đăng nhập đầu tiên", async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, "/login")

    expect(screen.getByText(/Điều khoản sử dụng cho lần đăng nhập đầu tiên/u)).toBeInTheDocument()
    const termsButtons = screen.getAllByRole("button", { name: "Điều khoản sử dụng" })
    expect(termsButtons.length).toBeGreaterThan(0)
    await user.click(termsButtons[0])
    expect(screen.getByText(/Điều khoản sử dụng Rendez/u)).toBeInTheDocument()
  })

  it("trang /terms đầy đủ nội dung và không trỏ tới trang Giới thiệu đã xóa", () => {
    renderWithProviders(<TermsPage />, "/terms")

    expect(screen.getByText(/1\. Điều kiện sử dụng & Chấp nhận điều khoản/u)).toBeInTheDocument()
    expect(screen.getByText(/6\. Kiểm duyệt vi phạm & Xoá tài khoản/u)).toBeInTheDocument()
    expect(screen.queryByText(/trang Giới thiệu/u)).not.toBeInTheDocument()
  })
})
