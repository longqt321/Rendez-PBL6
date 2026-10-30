import { describe, expect, it, vi, afterEach } from "vitest";
import { api, currency, discoveryQuery } from "./client";

describe("API contracts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("dispatches session-expired event when receiving 401 on protected endpoints", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Phiên hết hạn" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    let eventFired = false;
    const listener = () => {
      eventFired = true;
    };
    window.addEventListener("rendez:session-expired", listener);

    await expect(api("favorites/")).rejects.toThrow("Phiên hết hạn");
    expect(eventFired).toBe(true);
    window.removeEventListener("rendez:session-expired", listener);
  });

  it("does not dispatch session-expired event on auth/me 401 guest checks", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Chưa đăng nhập" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    let eventFired = false;
    const listener = () => {
      eventFired = true;
    };
    window.addEventListener("rendez:session-expired", listener);

    await expect(api("auth/me/")).rejects.toThrow("Chưa đăng nhập");
    expect(eventFired).toBe(false);
    window.removeEventListener("rendez:session-expired", listener);
  });

  it("does not dispatch session-expired event on auth/login 401 invalid credentials", async () => {
    // 1. Mock GET csrf
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: "dummy" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      // 2. Mock POST auth/login
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: "Email hoặc mật khẩu không đúng." }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    let eventFired = false;
    const listener = () => {
      eventFired = true;
    };
    window.addEventListener("rendez:session-expired", listener);

    await expect(
      api("auth/login/", { method: "POST", body: "{}" }),
    ).rejects.toThrow("Email hoặc mật khẩu không đúng.");
    expect(eventFired).toBe(false);
    window.removeEventListener("rendez:session-expired", listener);
  });
});
