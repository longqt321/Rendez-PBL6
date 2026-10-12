import { describe, expect, it } from "vitest";
import { currency, discoveryQuery } from "./client";
describe("API contracts", () => {
  it("keeps missing prices unknown", () => {
    expect(currency(null)).toBe("Chưa có dữ liệu giá");
    expect(currency(0)).toBe("0 đ");
  });
  it("shares only supported discovery filters", () => {
    expect(
      discoveryQuery(
        new URLSearchParams(
          "q=cafe&category=cafe&attributes=test-x%2Ctest-y&lat=16&secret=x",
        ),
      ).toString(),
    ).toBe("q=cafe&category=cafe&attributes=test-x%2Ctest-y");
  });
});
