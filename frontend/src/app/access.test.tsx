import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { RequireLogin } from "./App";
const session = vi.hoisted(() => ({
  data: null as object | null,
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
  session.data = null;
  session.isPending = false;
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
  "/contributions/new",
  "/contributions/test",
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
it("allows an authenticated session", () => {
  session.data = { id: "user" };
  renderPage("/discover");
  expect(screen.getByText("Nội dung riêng tư")).toBeVisible();
});
