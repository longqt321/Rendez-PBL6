import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { Auth } from "./auth";
import App from "./App";
import { Filters } from "./shared";

const session = vi.hoisted(() => ({
  data: {
    id: "user-1",
    email: "user@example.com",
    display_name: "Long Tran",
  } as { id: string; email: string; display_name: string } | null,
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

describe("Accessibility and Keyboard Interactions", () => {
  describe("ConfirmDialog", () => {
    it("has accessible name and description bound via ARIA attributes", () => {
      render(
        <ConfirmDialog
          open={true}
          title="Xác nhận xóa ảnh"
          description="Hành động này không thể hoàn tác."
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby", "confirm-dialog-title");
      expect(dialog).toHaveAttribute("aria-describedby", "confirm-dialog-desc");
      expect(screen.getByText("Xác nhận xóa ảnh")).toHaveAttribute(
        "id",
        "confirm-dialog-title",
      );
      expect(
        screen.getByText("Hành động này không thể hoàn tác."),
      ).toHaveAttribute("id", "confirm-dialog-desc");
    });

    it("triggers onCancel when clicking Cancel button or dialog cancel event", () => {
      const onCancel = vi.fn();
      render(
        <ConfirmDialog
          open={true}
          title="Cảnh báo"
          description="Bạn có chắc chắn không?"
          onConfirm={vi.fn()}
          onCancel={onCancel}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
      expect(onCancel).toHaveBeenCalledTimes(1);

      const dialog = screen.getByRole("dialog");
      fireEvent(dialog, new Event("cancel"));
      expect(onCancel).toHaveBeenCalledTimes(2);
    });
  });

  describe("AccountMenu keyboard interaction and ARIA markup", () => {
    it("toggles menu with proper aria-expanded, aria-haspopup, and closes on Escape", () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/profile"]}>
            <App />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      const trigger = screen.getByRole("button", {
        name: "Tài khoản của Long Tran",
      });
      expect(trigger).toHaveAttribute("aria-haspopup", "menu");
      expect(trigger).toHaveAttribute("aria-expanded", "false");

      // Open menu
      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      const menu = screen.getByRole("menu");
      expect(menu).toBeVisible();

      const logoutItem = screen.getByRole("menuitem", { name: "Đăng xuất" });
      expect(logoutItem).toBeVisible();

      // Press Escape to close and refocus trigger
      fireEvent.keyDown(document, { key: "Escape" });
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("menu")).toBeNull();
      expect(trigger).toHaveFocus();
    });
  });

  describe("Auth form accessibility", () => {
    it("links input fields with error descriptions marked with role='alert'", () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      session.data = null; // Unauthenticated guest
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/register"]}>
            <Routes>
              <Route path="register" element={<Auth register={true} />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );

      const nameInput = screen.getByLabelText("Tên hiển thị");
      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Mật khẩu");

      expect(nameInput).toHaveAttribute("aria-describedby", "auth-name-error");
      expect(emailInput).toHaveAttribute(
        "aria-describedby",
        "auth-email-error",
      );
      expect(passwordInput).toHaveAttribute(
        "aria-describedby",
        "auth-password-error",
      );

      // Verify the error spans have role="alert"
      const alertSpans = document.querySelectorAll(
        "#auth-name-error, #auth-email-error, #auth-password-error",
      );
      expect(alertSpans).toHaveLength(3);
      alertSpans.forEach((span) => {
        expect(span).toHaveAttribute("role", "alert");
      });
    });

    it("has accessible toggle password reveal button with aria-pressed state", () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      session.data = null;
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/login"]}>
            <Routes>
              <Route path="login" element={<Auth register={false} />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );

      const passwordInput = screen.getByLabelText("Mật khẩu");
      expect(passwordInput).toHaveAttribute("type", "password");

      const toggleButton = screen.getByRole("button", {
        name: "Hiện mật khẩu",
      });
      expect(toggleButton).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "text");
      expect(toggleButton).toHaveAttribute("aria-label", "Ẩn mật khẩu");
      expect(toggleButton).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("Filters accessibility", () => {
    it("renders filter group with role='group' and descriptive aria-label on chips", () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/discover?attributes=wifi,outdoor"]}>
            <Filters />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      const group = screen.getByRole("group", {
        name: "Bộ lọc đã áp dụng",
      });
      expect(group).toBeInTheDocument();

      const chipWifi = screen.getByRole("button", { name: "Bỏ lọc: wifi" });
      const chipOutdoor = screen.getByRole("button", {
        name: "Bỏ lọc: outdoor",
      });
      expect(chipWifi).toBeVisible();
      expect(chipOutdoor).toBeVisible();
    });
  });
});
