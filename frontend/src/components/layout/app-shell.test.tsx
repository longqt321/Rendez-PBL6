import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { NuqsAdapter } from "nuqs/adapters/react-router/v8"
import { createMemoryRouter, RouterProvider } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SkinProvider } from "@/app/providers/skin-provider"
import { ThemeProvider } from "@/app/providers/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppShell } from "./app-shell"

const testState = vi.hoisted((): { role: "admin" | "moderator" | "user" | null } => ({
  role: "user",
}))

vi.mock("@/features/profile/hooks/use-me", () => ({
  useMe: () => ({
    data: testState.role
      ? {
          id: "u-test",
          name: "Người dùng thử",
          handle: "tester",
          initials: "NT",
          bio: "",
          location: "Đà Nẵng",
          joinedAt: "2026-10-01T00:00:00Z",
          privateProfile: false,
          followersCount: 0,
          followingCount: 0,
          postCount: 0,
          role: testState.role,
        }
      : undefined,
    isPending: false,
    isError: testState.role === null,
  }),
}))

vi.mock("@/features/notification/hooks/use-notifications", () => ({
  useUnreadNotificationCount: () => ({ data: 0 }),
  useNotifications: () => ({ notifications: [], isPending: false }),
}))

vi.mock("@/features/notification/hooks/use-mark-all-notifications-read", () => ({
  useMarkAllNotificationsRead: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock("@/features/notification/hooks/use-notification-stream", () => ({
  useNotificationStream: () => undefined,
}))

vi.mock("@/features/messages/hooks/use-messages", () => ({
  useUnreadMessagesCount: () => 0,
}))

vi.mock("@/features/rooms/hooks/use-rooms", () => ({
  useRooms: () => ({ activeCode: null, getRoom: () => undefined }),
}))

vi.mock("@/features/auth/hooks/use-logout", () => ({
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock("@/hooks/use-user-location", () => ({
  useMobileGpsAutoSync: () => undefined,
}))

function renderShell(initialPath = "/discover") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      {
        path: "/admin",
        element: <div>Trang quản trị</div>,
      },
      {
        element: (
          <NuqsAdapter>
            <AppShell />
          </NuqsAdapter>
        ),
        children: [{ path: "/discover", element: <div>Nội dung khám phá</div> }],
      },
    ],
    { initialEntries: [initialPath] },
  )

  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <SkinProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
          </TooltipProvider>
        </SkinProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

describe("AppShell role isolation", () => {
  beforeEach(() => {
    testState.role = "user"
  })

  it("chuyển hướng tài khoản admin sang /admin thay vì mở giao diện người dùng", () => {
    testState.role = "admin"
    renderShell("/discover")

    expect(screen.getByText("Trang quản trị")).toBeInTheDocument()
    expect(screen.queryByText("Nội dung khám phá")).not.toBeInTheDocument()
  })

  it("chuyển hướng tài khoản moderator sang /admin thay vì mở giao diện người dùng", () => {
    testState.role = "moderator"
    renderShell("/discover")

    expect(screen.getByText("Trang quản trị")).toBeInTheDocument()
    expect(screen.queryByText("Nội dung khám phá")).not.toBeInTheDocument()
  })

  it("người dùng thường xem được giao diện công khai và không thấy liên kết quản trị", () => {
    testState.role = "user"
    renderShell("/discover")

    expect(screen.getByText("Nội dung khám phá")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Quản trị/u })).not.toBeInTheDocument()
    expect(screen.queryByText(/Đang xem trang công khai/u)).not.toBeInTheDocument()
  })

  it("khách chưa đăng nhập vẫn xem được giao diện khám phá", () => {
    testState.role = null
    renderShell("/discover")

    expect(screen.getByText("Nội dung khám phá")).toBeInTheDocument()
  })
})
