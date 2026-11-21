import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ReviewForm } from "./review-form"
import { ReviewItem } from "./review-item"
import type { Review } from "../types/review"

const deleteReview = vi.hoisted(() => vi.fn())
const upsertReview = vi.hoisted(() => vi.fn())

vi.mock("../api/delete-review", () => ({
  deleteReview: (placeId: string) => deleteReview(placeId) as Promise<void>,
}))

vi.mock("../api/upsert-review", () => ({
  upsertReview: (placeId: string, input: unknown) =>
    upsertReview(placeId, input) as Promise<unknown>,
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const PLACE_ID = "banh-xeo-ba-duong"

const MY_REVIEW: Review = {
  id: "r-mine",
  placeId: PLACE_ID,
  author: { id: "u-me", name: "Tôi", handle: "toi", initials: "T" },
  rating: 5,
  content: "Rất ngon và giòn",
  createdAt: "2026-11-10T10:00:00Z",
  isMine: true,
}

const OTHER_REVIEW: Review = {
  id: "r-other",
  placeId: PLACE_ID,
  author: { id: "u-other", name: "Người khác", handle: "other", initials: "NK" },
  rating: 4,
  content: "Bình thường",
  createdAt: "2026-11-09T10:00:00Z",
  isMine: false,
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("ReviewItem", () => {
  it("hiển thị nút Sửa và Xoá khi review là của chính mình (isMine: true)", () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()

    renderWithClient(<ReviewItem review={MY_REVIEW} onEdit={onEdit} onDelete={onDelete} />)

    expect(screen.getByRole("button", { name: /sửa/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /xoá/i })).toBeInTheDocument()
  })

  it("không hiển thị nút Sửa hay Xoá khi review của người khác (isMine: false)", () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()

    renderWithClient(<ReviewItem review={OTHER_REVIEW} onEdit={onEdit} onDelete={onDelete} />)

    expect(screen.queryByRole("button", { name: /sửa/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /xoá/i })).not.toBeInTheDocument()
  })

  it("bấm nút Xoá gọi callback onDelete", async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()

    renderWithClient(<ReviewItem review={MY_REVIEW} onDelete={onDelete} />)

    await user.click(screen.getByRole("button", { name: /xoá/i }))
    expect(onDelete).toHaveBeenCalledWith(MY_REVIEW)
  })
})

describe("ReviewForm", () => {
  it("chế độ sửa (myReview khác null) hiển thị nút 'Xoá đánh giá'", () => {
    renderWithClient(<ReviewForm placeId={PLACE_ID} myReview={MY_REVIEW} authorInitials="T" />)

    expect(screen.getByRole("button", { name: /xoá đánh giá/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /cập nhật/i })).toBeInTheDocument()
  })

  it("chế độ tạo mới (myReview = null) không hiển thị nút 'Xoá đánh giá'", () => {
    renderWithClient(<ReviewForm placeId={PLACE_ID} myReview={null} authorInitials="T" />)

    expect(screen.queryByRole("button", { name: /xoá đánh giá/i })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /gửi đánh giá/i })).toBeInTheDocument()
  })

  it("bấm nút 'Xoá đánh giá' mở dialog xác nhận và có thể thực hiện xoá", async () => {
    deleteReview.mockResolvedValue(undefined)
    const user = userEvent.setup()
    const onDone = vi.fn()

    renderWithClient(
      <ReviewForm placeId={PLACE_ID} myReview={MY_REVIEW} authorInitials="T" onDone={onDone} />,
    )

    // Bấm nút xoá đánh giá trong form
    await user.click(screen.getByRole("button", { name: /xoá đánh giá/i }))

    // Dialog xác nhận xuất hiện
    expect(await screen.findByText("Xoá đánh giá này?")).toBeInTheDocument()
    expect(
      screen.getByText("Đánh giá của bạn tại địa điểm này sẽ bị xoá và không thể hoàn tác."),
    ).toBeInTheDocument()

    // Bấm xác nhận Xoá trong dialog
    const confirmDeleteBtn = screen.getByRole("button", { name: /^xoá$/i })
    await user.click(confirmDeleteBtn)

    await waitFor(() => {
      expect(deleteReview).toHaveBeenCalledWith(PLACE_ID)
      expect(onDone).toHaveBeenCalled()
    })
  })
})
