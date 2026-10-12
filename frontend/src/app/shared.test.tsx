import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ApiError } from "../lib/api/client";
import { Cover, ErrorText } from "./shared";
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

it("shows one actionable server error without repeating the message", async () => {
  const { State } = await import("./shared");
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
