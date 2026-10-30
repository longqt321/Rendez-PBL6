import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api/client";
import { Cover, ErrorText, State } from "./shared";
import { ConfirmDialog } from "../components/ui/confirm-dialog";

afterEach(cleanup);

it("shows a neutral fallback when a real media request fails", () => {
  render(
    <Cover
      place={{
        name: "Quán mẫu",
        cover_image_url: "/public-photo-media/missing/",
      }}
    />,
  );
  fireEvent.error(screen.getByRole("img", { name: "Quán mẫu" }));
  expect(screen.getByText("Chưa có ảnh")).toBeVisible();
  expect(screen.queryByRole("img")).toBeNull();
});

it("renders nested API validation messages as readable text", () => {
  const fields = JSON.parse(
    '{"images":{"0":["Ảnh bị hỏng hoặc không hợp lệ."]}}',
  );
  render(
    <ErrorText
      error={new ApiError(400, fields, "Kiểm tra lại thông tin đã nhập.")}
    />,
  );
  expect(screen.getByText("Ảnh bị hỏng hoặc không hợp lệ.")).toBeVisible();
  expect(screen.queryByText(/\[object Object\]/)).toBeNull();
});

it("sanitizes 500 internal server errors without leaking stack traces or database info", () => {
  render(
    <ErrorText
      error={
        new ApiError(
          500,
          {},
          "OperationalError: FATAL: connection limit exceeded in postgresql.py at line 142",
        )
      }
    />,
  );
  expect(
    screen.getByText("Máy chủ hiện không phản hồi. Vui lòng thử lại sau."),
  ).toBeVisible();
  expect(screen.queryByText(/OperationalError/)).toBeNull();
  expect(screen.queryByText(/postgresql/)).toBeNull();
});

it("shows one actionable server error without repeating the message", async () => {
  let retries = 0;
  render(
    <State
      error={new ApiError(502, {}, "Không tải được nội dung.")}
      onRetry={() => {
        retries += 1;
      }}
    />,
  );
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  expect(
    screen.getByText("Máy chủ hiện không phản hồi. Bạn có thể thử lại sau."),
  ).toBeVisible();
  expect(screen.queryByText("Không tải được nội dung.")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
  expect(retries).toBe(1);
});

it("ConfirmDialog disables buttons and shows loading indicator while async operation is pending", () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();

  render(
    <ConfirmDialog
      open={true}
      title="Xác nhận xóa"
      description="Thao tác này không thể hoàn tác"
      confirmLabel="Xóa"
      isLoading={true}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );

  const confirmBtn = screen.getByRole("button", { name: "Đang xử lý…" });
  const cancelBtn = screen.getByRole("button", { name: "Hủy" });

  expect(confirmBtn).toBeDisabled();
  expect(cancelBtn).toBeDisabled();

  fireEvent.click(confirmBtn);
  expect(onConfirm).not.toHaveBeenCalled();
});
