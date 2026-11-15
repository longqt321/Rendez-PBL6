import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it, vi } from "vitest"
import { QueryClientProvider } from "@tanstack/react-query"
import { createTestQueryClient } from "@/test/query-test-utils"
import type { UserSuggestion } from "@rendez/schema"
import { UserSuggestionsSection } from "./user-suggestions-section"

interface SectionState {
  me: { id: string } | undefined
  value: { data?: UserSuggestion[]; isPending: boolean; isError: boolean }
}

const state = vi.hoisted((): SectionState => ({
  me: { id: "u-me" },
  value: { isPending: false, isError: false },
}))

vi.mock("@/features/profile/hooks/use-me", () => ({
  useMe: () => ({ data: state.me }),
}))

vi.mock("../hooks/use-user-suggestions", () => ({
  useUserSuggestions: () => state.value,
}))

const SUGGESTION: UserSuggestion = {
  user: {
    id: "u-lan",
    name: "Lan Anh",
    handle: "lananh.cafe",
    initials: "LA",
    bio: "",
    location: "TP. Hồ Chí Minh",
    avatarUrl: null,
    coverUrl: null,
    joinedAt: "2025-06-02T00:00:00+07:00",
    postCount: 0,
    followerCount: 0,
    followingCount: 0,
    followedByMe: false,
    isMe: false,
    privateProfile: false,
  },
  reason: "Gợi ý cho bạn",
}

function renderSection() {
  // `FollowButton` dùng mutation nên cần QueryClient, dù hook dữ liệu đã mock.
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <UserSuggestionsSection />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("UserSuggestionsSection", () => {
  it("đang tải → heading + skeleton, chưa có hàng user", () => {
    state.me = { id: "u-me" }
    state.value = { isPending: true, isError: false }
    renderSection()

    expect(screen.getByRole("heading", { level: 2, name: "Gợi ý theo dõi" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Theo dõi" })).not.toBeInTheDocument()
  })

  it("rỗng → không render gì (kể cả heading)", () => {
    state.me = { id: "u-me" }
    state.value = { isPending: false, isError: false, data: [] }
    const { container } = renderSection()

    expect(container).toBeEmptyDOMElement()
  })

  it("lỗi → không render gì, không chặn trang tìm kiếm", () => {
    state.me = { id: "u-me" }
    state.value = { isPending: false, isError: true }
    const { container } = renderSection()

    expect(container).toBeEmptyDOMElement()
  })

  it("guest → không render gì (endpoint cần đăng nhập)", () => {
    state.me = undefined
    state.value = { isPending: false, isError: false, data: [SUGGESTION] }
    const { container } = renderSection()

    expect(container).toBeEmptyDOMElement()
  })

  it("có dữ liệu → heading, tên + lý do + nút Theo dõi", () => {
    state.me = { id: "u-me" }
    state.value = { isPending: false, isError: false, data: [SUGGESTION] }
    renderSection()

    expect(screen.getByRole("heading", { level: 2, name: "Gợi ý theo dõi" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Lan Anh/u })).toHaveAttribute("href", "/u/lananh.cafe")
    expect(screen.getByText(/Gợi ý cho bạn/u)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Theo dõi" })).toBeInTheDocument()
  })
})
