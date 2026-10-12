import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Button } from "./button";
afterEach(cleanup);
it("preserves disabled controls and link semantics", () => {
  const click = vi.fn();
  render(
    <>
      <Button disabled onClick={click}>
        Gửi
      </Button>
      <Button asChild>
        <a href="/discover">Khám phá</a>
      </Button>
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Gửi" }));
  expect(click).not.toHaveBeenCalled();
  expect(screen.getByRole("link")).toHaveAttribute("href", "/discover");
});
