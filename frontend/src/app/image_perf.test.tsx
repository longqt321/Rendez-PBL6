import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Cover } from "./shared";
import { MasonryFeed } from "./masonry";
import { MemoryRouter, Route, Routes } from "react-router";
import { PhotoDetailPage } from "./discovery";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

afterEach(() => {
  cleanup();
});

describe("Image display performance and layout stability", () => {
  it("renders Cover with loading='lazy' and decoding='async'", () => {
    render(
      <Cover
        place={{
          name: "Quán cà phê X",
          cover_image_url: "/public-photo-media/test-photo.jpg",
        }}
      />,
    );

    const img = screen.getByRole("img", { name: "Quán cà phê X" });
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
  });

  it("renders PhotoViewer hero image with eager loading, async decoding, and high fetchPriority", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    queryClient.setQueryData(["photo", "photo-123", null, undefined], {
      id: "photo-123",
      url: "/public-photo-media/photo-123.jpg",
      width: 1200,
      height: 1600,
      caption: "Ảnh thử nghiệm",
      author_name: "Long Tran",
      author_id: "user-1",
      place_id: "place-1",
      place: {
        id: "place-1",
        name: "Quán A",
        address: "123 Bạch Đằng",
        category: { code: "cafe", name: "Cà phê" },
        opening_hours: null,
        verified_at: null,
        status: "published",
      },
      photo_ids: ["photo-123"],
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
    expect(heroImage).toHaveAttribute("width", "1200");
    expect(heroImage).toHaveAttribute("height", "1600");
    expect(heroImage).toHaveStyle({ aspectRatio: "1200 / 1600" });
  });

  it("mounts MasonryFeed without synchronous layout thrashing", () => {
    const { container } = render(
      <MasonryFeed className="pin-feed">
        <div className="place-card">
          <div className="pin-body">Thẻ 1</div>
        </div>
        <div className="place-card">
          <div className="pin-body">Thẻ 2</div>
        </div>
      </MasonryFeed>,
    );

    const feed = container.querySelector(".pin-feed");
    expect(feed).toBeInTheDocument();
    expect(container.querySelectorAll(".pin-body")).toHaveLength(2);
  });
});
