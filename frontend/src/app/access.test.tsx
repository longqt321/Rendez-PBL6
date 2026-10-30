import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { RequireLogin } from "./App";
import { Auth } from "./auth";
import { sanitizeReturnTo, State } from "./shared";
import { ApiError } from "../lib/api/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const session = vi.hoisted(() => ({
  data: null as object | null,
  isPending: false,
  isError: false,
  error: null as Error | null,
  refetch: vi.fn(),
}));

vi.mock("./shared", async (original) => ({
  ...(await original<typeof import("./shared")>()),
  useMe: () => session,
}));

afterEach(() => {
  cleanup();
  session.data = null;
  session.isPending = false;
  session.isError = false;
  session.error = null;
  vi.clearAllMocks();
});

function Login() {
  const location = useLocation();
  return <p>Đăng nhập {location.state?.returnTo}</p>;
}

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<RequireLogin />}>
          <Route path="*" element={<p>Nội dung riêng tư</p>} />
        </Route>
        <Route path="login" element={<Login />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderAuthPage(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="login" element={<Auth key="login" register={false} />} />
          <Route
            path="register"
            element={<Auth key="register" register={true} />}
          />
          <Route path="discover" element={<p>Trang Khám phá</p>} />
          <Route path="saved" element={<p>Trang Đã lưu</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Route guards and access boundaries", () => {
  it.each([
    "/discover",
    "/map?category=cafe",
    "/saved",
    "/profile",
    "/places/test",
    "/photos/test",
    "/submissions",
    "/submissions/new",
    "/submissions/test",
    "/creators/test",
    "/unknown",
  ])("blocks direct guest URL %s and preserves its destination", (path) => {
    renderPage(path);
    expect(screen.getByText("Đăng nhập " + path)).toBeVisible();
    expect(screen.queryByText("Nội dung riêng tư")).toBeNull();
  });

  it("does not expose content while checking the session", () => {
    session.isPending = true;
    renderPage("/discover");
    expect(screen.getByRole("status", { name: "Đang tải" })).toBeVisible();
    expect(screen.queryByText("Nội dung riêng tư")).toBeNull();
  });

  it("does not expose content when session check encounters an error", () => {
    session.isError = true;
    session.error = new ApiError(500, {}, "Lỗi kết nối máy chủ");
    renderPage("/discover");
    expect(screen.queryByText("Nội dung riêng tư")).toBeNull();
    expect(
      screen.getByText("Máy chủ hiện không phản hồi. Bạn có thể thử lại sau."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeVisible();
  });

  it("allows an authenticated session", () => {
    session.data = { id: "user", email: "user@example.com" };
    renderPage("/discover");
    expect(screen.getByText("Nội dung riêng tư")).toBeVisible();
  });

  it("redirects to login when session expires", () => {
    session.data = { id: "user" };
    const { rerender } = renderPage("/discover");
    expect(screen.getByText("Nội dung riêng tư")).toBeVisible();

    // Session expired event resets session data
    session.data = null;
    rerender(
      <MemoryRouter initialEntries={["/discover"]}>
        <Routes>
          <Route element={<RequireLogin />}>
            <Route path="*" element={<p>Nội dung riêng tư</p>} />
          </Route>
          <Route path="login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Đăng nhập /discover")).toBeVisible();
    expect(screen.queryByText("Nội dung riêng tư")).toBeNull();
  });
});

describe("Destination sanitization and recovery (sanitizeReturnTo)", () => {
  it("preserves valid relative paths and search params", () => {
    expect(sanitizeReturnTo("/discover")).toBe("/discover");
    expect(sanitizeReturnTo("/saved?category=cafe#top")).toBe(
      "/saved?category=cafe#top",
    );
    expect(sanitizeReturnTo("/places/danang-cafe-123")).toBe(
      "/places/danang-cafe-123",
    );
  });

  it("neutralizes redirect loops to login or register", () => {
    expect(sanitizeReturnTo("/login")).toBeNull();
    expect(sanitizeReturnTo("/login?returnTo=/saved")).toBeNull();
    expect(sanitizeReturnTo("/register")).toBeNull();
    expect(sanitizeReturnTo("/register?tab=email")).toBeNull();
  });

  it("blocks protocol-relative, backslash and open redirect attempts", () => {
    expect(sanitizeReturnTo("//evil.com")).toBeNull();
    expect(sanitizeReturnTo("//malicious.org/phish")).toBeNull();
    expect(sanitizeReturnTo("/\\evil.com")).toBeNull();
    expect(sanitizeReturnTo("/path\\with\\backslash")).toBeNull();
    expect(sanitizeReturnTo("https://evil.com/hack")).toBeNull();
    expect(sanitizeReturnTo("javascript:alert(1)")).toBeNull();
  });

  it("handles null, empty, or undefined gracefully", () => {
    expect(sanitizeReturnTo("")).toBeNull();
    expect(sanitizeReturnTo("   ")).toBeNull();
    expect(sanitizeReturnTo(null)).toBeNull();
    expect(sanitizeReturnTo(undefined)).toBeNull();
  });
});

describe("Guest and Authenticated Auth Page Behavior", () => {
  it("renders login form for unauthenticated user", () => {
    session.data = null;
    renderAuthPage("/login");
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeVisible();
  });

  it("redirects authenticated user away from login to discover", () => {
    session.data = { id: "user", email: "user@example.com" };
    renderAuthPage("/login");
    expect(screen.getByText("Trang Khám phá")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Đăng nhập" })).toBeNull();
  });

  it("redirects authenticated user away from login to valid returnTo in query param", () => {
    session.data = { id: "user", email: "user@example.com" };
    renderAuthPage("/login?returnTo=/saved");
    expect(screen.getByText("Trang Đã lưu")).toBeVisible();
  });

  it("neutralizes open redirect and redirects authenticated user to discover", () => {
    session.data = { id: "user", email: "user@example.com" };
    renderAuthPage("/login?returnTo=//evil.com");
    expect(screen.getByText("Trang Khám phá")).toBeVisible();
  });

  it("neutralizes redirect loop and redirects authenticated user to discover", () => {
    session.data = { id: "user", email: "user@example.com" };
    renderAuthPage("/login?returnTo=/login");
    expect(screen.getByText("Trang Khám phá")).toBeVisible();
  });
});

describe("State component error boundary handling", () => {
  it("renders 401 session expired notice and login link", () => {
    render(
      <MemoryRouter>
        <State
          error={
            new ApiError(401, {}, "Vui lòng đăng nhập lại để tiếp tục sử dụng.")
          }
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Phiên đăng nhập đã hết hạn")).toBeVisible();
    expect(
      screen.getByText("Vui lòng đăng nhập lại để tiếp tục sử dụng."),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Đăng nhập lại" })).toBeVisible();
  });

  it("renders 403 forbidden notice when unauthorized", () => {
    render(
      <MemoryRouter>
        <State
          error={
            new ApiError(
              403,
              {},
              "Bạn không có quyền xem hoặc thực hiện thao tác này.",
            )
          }
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Không có quyền truy cập")).toBeVisible();
    expect(
      screen.getByText("Bạn không có quyền xem hoặc thực hiện thao tác này."),
    ).toBeVisible();
  });
});
