import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const apiMock = vi.hoisted(() => vi.fn());

vi.mock("../../lib/api/client", () => ({
  api: apiMock,
  ApiError: class ApiError extends Error {},
}));

vi.mock("../../lib/session", () => ({
  useMe: () => ({
    data: { id: "user-1", display_name: "Long Tran", is_staff: false },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("../../lib/api/queries", () => ({
  useCategories: () => ({
    data: [{ slug: "study", name: "Học bài" }],
    isPending: false,
    isError: false,
  }),
}));

// The map picker pulls in MapLibre, which needs WebGL. The geocode note under
// test renders before the picker is ever opened.
vi.mock("../../app/map", () => ({
  LocationPicker: () => null,
}));

import { CreateExperiencePage } from "./CreateExperiencePage";

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/create"]}>
        <CreateExperiencePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Type an address into the proposal form and wait past the 450 ms debounce. */
async function proposeAddress(address: string) {
  fireEvent.click(screen.getByLabelText("Thêm địa điểm mới"));
  fireEvent.change(screen.getByLabelText("Địa chỉ"), {
    target: { value: address },
  });
  await vi.advanceTimersByTimeAsync(500);
}

beforeEach(() => {
  vi.useFakeTimers();
  apiMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("CreateExperiencePage geocoding feedback", () => {
  it("shows the resolved address and provider when geocoding succeeds", async () => {
    apiMock.mockResolvedValue({
      success: true,
      latitude: 16.0751,
      longitude: 108.1498,
      display_name: "100 Phạm Như Xương, Liên Chiểu, Đà Nẵng",
      provider: "nominatim",
    });

    renderPage();
    await proposeAddress("100 Phạm Như Xương, Liên Chiểu, Đà Nẵng");

    expect(screen.getByText(/Đã định vị/)).toBeInTheDocument();
    expect(screen.getByText(/Nguồn: nominatim/)).toBeInTheDocument();
    expect(screen.queryByText(/Chưa định vị được/)).not.toBeInTheDocument();
  });

  it("warns that the place will have no pin when every source fails", async () => {
    // The backend returns success:false rather than inventing coordinates.
    apiMock.mockResolvedValue({
      success: false,
      message: "Không thể xác định vị trí từ địa chỉ đã cho.",
    });

    renderPage();
    await proposeAddress("Một địa chỉ không tồn tại trên đời");

    expect(
      screen.getByText(/Chưa định vị được địa chỉ này/),
    ).toBeInTheDocument();
    expect(screen.getByText(/không có ghim/)).toBeInTheDocument();
    expect(screen.queryByText(/Đã định vị/)).not.toBeInTheDocument();
  });

  it("treats a network error as a failed lookup, not a silent success", async () => {
    apiMock.mockRejectedValue(new Error("mất mạng"));

    renderPage();
    await proposeAddress("100 Phạm Như Xương, Liên Chiểu, Đà Nẵng");

    expect(
      screen.getByText(/Chưa định vị được địa chỉ này/),
    ).toBeInTheDocument();
  });
});
