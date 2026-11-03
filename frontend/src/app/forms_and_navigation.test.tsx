import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SearchBar } from "./layouts/search-bar";
import { ProfilePage } from "./auth";

const session = vi.hoisted(() => ({
  data: {
    id: "user-1",
    email: "user@example.test",
    display_name: "Long Tran",
    is_staff: false,
    photo_count: 3,
    saved_count: 5,
  } as object | null,
  isPending: false,
  isError: false,
  error: null as Error | null,
  refetch: vi.fn(),
}));

vi.mock("../lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/session")>();
  return {
    ...actual,
    useMe: () => session,
    useLogout: () => ({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    }),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SearchBar component navigation and query preservation", () => {
  it("submits search query and updates input value", () => {
    render(
      <MemoryRouter initialEntries={["/discover"]}>
        <SearchBar />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(
      "Tìm kiếm địa điểm, quán cà phê, không gian đẹp tại Đà Nẵng...",
    );
    fireEvent.change(input, { target: { value: "Bạch Đằng" } });

    const searchButton = screen.getByRole("button", { name: "Tìm kiếm" });
    fireEvent.click(searchButton);

    expect(input).toHaveValue("Bạch Đằng");
  });
});

describe("ProfilePage information and tab navigation", () => {
  it("renders profile identity, stats and updates aria-current on tab navigation", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    queryClient.setQueryData(["user-submissions", "user-1", 1], {
      count: 0,
      results: [],
    });
    queryClient.setQueryData(["user-favorites", "user-1", 1], {
      count: 0,
      results: [],
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter key="/profile" initialEntries={["/profile"]}>
          <Routes>
            <Route path="profile" element={<ProfilePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Long Tran" }),
    ).toBeInTheDocument();
    expect(screen.getByText("user@example.test")).toBeInTheDocument();
    expect(screen.getByText("Ảnh đã chia sẻ")).toBeInTheDocument();
    expect(screen.getAllByText("Địa điểm đã lưu").length).toBeGreaterThan(0);

    // In default /profile: "Ảnh đã đăng" tab is active
    const photosTab = screen.getByRole("link", { name: /Ảnh đã đăng/ });
    expect(photosTab).toHaveAttribute("aria-current", "page");

    // Remount with ?tab=saved
    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          key="/profile?tab=saved"
          initialEntries={["/profile?tab=saved"]}
        >
          <Routes>
            <Route path="profile" element={<ProfilePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const savedTab = screen.getByRole("link", { name: /^Địa điểm đã lưu$/ });
    expect(savedTab).toHaveAttribute("aria-current", "page");
  });
});
