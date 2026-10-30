import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SearchBar } from "./shared";
import { ProfilePage } from "./auth";
import { NewContribution } from "./contributions";

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

vi.mock("./shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./shared")>();
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

describe("PhotoForm step validation and state transitions", () => {
  function createTestQueryClient() {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(["me"], {
      id: "user-1",
      email: "user@example.test",
      display_name: "Long Tran",
      is_staff: false,
      photo_count: 3,
      saved_count: 5,
    });
    client.setQueryData(["submission-places", ""], {
      count: 1,
      results: [
        {
          id: "place-1",
          name: "Cà phê Sông Hàn",
          address: "123 Bạch Đằng",
          category: { code: "cafe", name: "Cà phê" },
          cover_image_url: null,
        },
      ],
    });
    client.setQueryData(["categories"], [{ slug: "cafe", name: "Cà phê" }]);
    return client;
  }

  it("validates place selection on step 1 and warns if empty", () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/submissions/new"]}>
          <Routes>
            <Route path="submissions/new" element={<NewContribution />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Initial state: Step 1
    expect(
      screen.getByRole("heading", { name: "Đăng ảnh địa điểm" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1. Chọn địa điểm")).toHaveAttribute(
      "aria-current",
      "step",
    );

    // Click "Tiếp tục" without choosing place
    const nextButton = screen.getByRole("button", { name: "Tiếp tục" });
    fireEvent.click(nextButton);

    // Validation alert shown
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "Chọn địa điểm hoặc nhập tên và địa chỉ địa điểm mới.",
    );
  });

  it("transitions from step 1 to step 2 when creating a new place proposal", () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/submissions/new"]}>
          <Routes>
            <Route path="submissions/new" element={<NewContribution />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Check "Thêm địa điểm mới"
    const checkbox = screen.getByLabelText("Thêm địa điểm mới");
    fireEvent.click(checkbox);

    // Fill in place proposal fields
    const nameInput = screen.getByPlaceholderText("Ví dụ: Tiệm Cà Phê Mộc");
    const addressInput = screen.getByPlaceholderText(
      "Ví dụ: 100 Phạm Như Xương, Liên Chiểu, Đà Nẵng",
    );

    fireEvent.change(nameInput, { target: { value: "Quán Mộc Mới" } });
    fireEvent.change(addressInput, {
      target: { value: "100 Phạm Như Xương, Đà Nẵng" },
    });

    // Click "Tiếp tục" to advance to step 2
    const nextButton = screen.getByRole("button", { name: "Tiếp tục" });
    fireEvent.click(nextButton);

    // Step 2 reached
    expect(screen.getByText("2. Chọn ảnh")).toHaveAttribute(
      "aria-current",
      "step",
    );

    // Click "Tiếp tục" on step 2 without selecting photos
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Chọn ít nhất 1 ảnh.");
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
    expect(screen.getByText("Địa điểm đã lưu")).toBeInTheDocument();

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

    const savedTab = screen.getByRole("link", { name: /Đã lưu/ });
    expect(savedTab).toHaveAttribute("aria-current", "page");
  });
});
