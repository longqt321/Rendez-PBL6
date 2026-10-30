import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { CommentSection, LikeButton } from "./social";

const session = vi.hoisted(() => ({
  data: { id: "user-1", display_name: "Tác giả" } as object | null,
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
}));

vi.mock("./shared", async (original) => ({
  ...(await original<typeof import("./shared")>()),
  useMe: () => session,
}));

afterEach(() => {
  cleanup();
  session.data = { id: "user-1", display_name: "Tác giả" };
});

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  );
}

it("renders comment section title and placeholder text", () => {
  renderWithProviders(<CommentSection photoId="test-photo-id" />);

  expect(screen.getByRole("region", { name: "Bình luận" })).toBeInTheDocument();
  expect(
    screen.getByPlaceholderText(
      "Chia sẻ cảm nhận hoặc câu chuyện của bạn về bức ảnh này…",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Gửi" })).toBeDisabled();
});

it("enables send button when comment body has content and maintains count", () => {
  renderWithProviders(<CommentSection photoId="test-photo-id" />);

  const textarea = screen.getByPlaceholderText(
    "Chia sẻ cảm nhận hoặc câu chuyện của bạn về bức ảnh này…",
  );
  fireEvent.change(textarea, { target: { value: "Bình luận thử nghiệm" } });

  expect(screen.getByRole("button", { name: "Gửi" })).toBeEnabled();
  expect(screen.getByText(/980.*ký tự còn lại/)).toBeInTheDocument();
});

it("renders like button with like count", () => {
  renderWithProviders(<LikeButton photoId="test-photo-id" />);

  const button = screen.getByRole("button", { name: "Thích ảnh" });
  expect(button).toBeInTheDocument();
  expect(button).toHaveTextContent("0");
});
