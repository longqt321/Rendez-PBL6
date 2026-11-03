import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SafeImage } from "../components/ui/safe-image";
import { MemoryRouter, Route, Routes } from "react-router";
import { PhotoDetailPage } from "../features/experiences/PhotoDetailPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

afterEach(() => {
  cleanup();
});

describe("Image display performance and layout stability", () => {
  it("renders SafeImage with loading='lazy' and decoding='async'", () => {
    render(
      <SafeImage
        sources={["/public-photo-media/test-photo.jpg"]}
        alt="Quán cà phê X"
        ratio="4 / 5"
      />,
    );

    const img = screen.getByRole("img", { name: "Quán cà phê X" });
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
  });

  it("renders the live photo hero image with eager loading, async decoding, and high fetchPriority", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // Khách (chưa đăng nhập): useMe trả về null qua cache, không gọi mạng.
    queryClient.setQueryData(["me"], null);
    queryClient.setQueryData(["photo", "photo-123", undefined], {
      id: "photo-123",
      url: "/public-photo-media/photo-123.jpg",
      width: 1200,
      height: 1600,
      alt_text: null,
      caption: "Ảnh thử nghiệm",
      author_name: "Long Tran",
      published_at: "2026-01-01T00:00:00Z",
      place: {
        id: "place-1",
        name: "Quán A",
        address: "123 Bạch Đằng",
        category: { code: "cafe", name: "Cà phê" },
        opening_hours: null,
        verified_at: null,
        status: "published",
      },
      attributes: [],
      likes_count: 5,
      is_liked: false,
      is_saved: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/photos/photo-123"]}>
          <Routes>
            <Route path="photos/:id" element={<PhotoDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const heroImage = await screen.findByRole("img", {
      name: "Ảnh thử nghiệm",
    });
    expect(heroImage).toHaveAttribute("loading", "eager");
    expect(heroImage).toHaveAttribute("decoding", "async");
    expect(heroImage).toHaveAttribute("fetchpriority", "high");
    // Tỷ lệ thật nằm trên khung bọc ảnh để giữ bố cục ổn định trước khi tải.
    const heroFrame = heroImage.closest(".media-frame") as HTMLElement;
    expect(heroFrame.style.aspectRatio).toBe("1200 / 1600");
  });
});
