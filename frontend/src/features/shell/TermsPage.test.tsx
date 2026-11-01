import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { TermsPage } from "./TermsPage";

afterEach(cleanup);

/**
 * The terms are the document a guest must be able to read before creating an
 * account, so the tests assert the parts a reader would look for rather than
 * the full text: the heading, the section on uploaded photos, and the link back
 * into the product.
 */
describe("Terms of use", () => {
  function renderPage() {
    return render(
      <MemoryRouter initialEntries={["/terms"]}>
        <TermsPage />
      </MemoryRouter>,
    );
  }

  it("states what the document is and when it changed", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "Điều khoản sử dụng" }),
    ).toBeVisible();
    expect(screen.getByText(/Cập nhật lần cuối/)).toBeVisible();
  });

  it("covers the obligations that apply to uploaded photos", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /Nội dung bạn đăng/ }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: /Xử lý ảnh và dữ liệu kỹ thuật/ }),
    ).toBeVisible();
    // The EXIF boundary is a promise to the contributor, so it must be stated.
    expect(screen.getByText(/loại bỏ siêu dữ liệu ảnh/i)).toBeVisible();
  });

  it("offers a way back into the product", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /Về Khám phá/ })).toHaveAttribute(
      "href",
      "/discover",
    );
  });
});
