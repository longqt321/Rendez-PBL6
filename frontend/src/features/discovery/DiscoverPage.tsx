import { Link } from "react-router";
import { MapPin, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useFeed, usePlaces } from "../../lib/api/queries";
import { useMe } from "../../lib/session";
import { AsyncState } from "../../components/ui/states";
import { Button } from "../../components/ui/button";
import { SafeImage } from "../../components/ui/safe-image";
import { extractDistrict } from "../../lib/format";
import { ExperienceCard } from "../experiences/ExperienceCard";
import { DiscoveryPrompt } from "./DiscoveryPrompt";

/**
 * Discover.
 *
 * Single-column feed designed for fluid exploration.
 * An infinite photo/experience stream (Threads/Instagram style).
 */
export function DiscoverPage() {
  const me = useMe();
  const userId = me.data?.id;
  const sentinel = useRef<HTMLDivElement>(null);

  const recentPlaces = usePlaces("sort=recent&page_size=6", userId);
  const feed = useFeed("page_size=10", userId);

  const experiences = useMemo(
    () => feed.data?.pages.flatMap((page) => page.results) ?? [],
    [feed.data],
  );

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feed;

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((entry) => entry.isIntersecting) &&
          hasNextPage &&
          !isFetchingNextPage
        ) {
          void fetchNextPage();
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const hasNothing = !feed.isPending && experiences.length === 0;

  const placeCount = recentPlaces.data?.count;

  return (
    <div className="discover grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8 max-w-6xl mx-auto px-1 py-6 items-start">
      {/* Cột feed chính */}
      <div className="discover-main flex flex-col gap-6 min-w-0">
        <header className="page-head discover-head flex items-end justify-between pb-3 border-b border-[var(--line)]">
          <div className="page-head__copy flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)]">Khám phá</h1>
            {placeCount != null && (
              <p className="muted small text-sm text-[var(--ink-soft)]">{placeCount} địa điểm đang chờ bạn ghé</p>
            )}
          </div>
        </header>

        <DiscoveryPrompt />

        {hasNothing ? (
          <AsyncState
            empty="Chưa có bài viết nào."
            emptyIcon={<Sparkles size={24} aria-hidden />}
            emptyActions={
              <Button asChild>
                <Link to="/create">Đăng ảnh đầu tiên</Link>
              </Button>
            }
          />
        ) : (
          <section
            className="discover-section flex flex-col gap-8"
            aria-labelledby="experiences-heading"
          >
            <h2 id="experiences-heading" className="sr-only">
              Ảnh mới nhất
            </h2>

            <AsyncState
              pending={feed.isPending}
              error={feed.data ? null : feed.error}
              onRetry={() => void feed.refetch()}
              loadingVariant="list"
            />

            {experiences.length > 0 && (
              <div className="discover-feed-list flex flex-col gap-8">
                {experiences.map((item, index) => (
                  <ExperienceCard
                    key={item.photo.id}
                    item={item}
                    eager={index < 2}
                  />
                ))}
              </div>
            )}

            <div ref={sentinel} aria-hidden="true" />

            {isFetchingNextPage && (
              <p className="muted small text-center text-xs text-[var(--ink-faint)] py-4" role="status">
                Đang tải thêm…
              </p>
            )}

            {feed.data && !hasNextPage && experiences.length > 0 && (
              <p className="muted small text-center text-xs text-[var(--ink-faint)] py-4">
                Bạn đã xem hết ảnh mới nhất.
              </p>
            )}
          </section>
        )}
      </div>

      {/* Panel phải: địa điểm gợi ý + liên kết bản đồ (ẩn dưới xl) */}
      <aside className="discover-side hidden xl:flex flex-col gap-6 sticky top-20" aria-label="Địa điểm gợi ý">
        <section className="card p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="group-label">Địa điểm mới</h2>
            <Link to="/search" className="text-xs font-semibold text-[var(--accent)] hover:underline">
              Xem tất cả
            </Link>
          </div>
          <AsyncState
            pending={recentPlaces.isPending}
            error={recentPlaces.data ? null : recentPlaces.error}
            loadingVariant="inline"
          />
          <ul className="flex flex-col gap-3" role="list">
            {(recentPlaces.data?.results ?? []).slice(0, 4).map((place) => (
              <li key={place.id}>
                <Link
                  to={"/places/" + place.id}
                  className="group flex items-center gap-3 rounded-xl p-1.5 -m-1.5 hover:bg-[var(--surface-muted)] transition-colors"
                >
                  <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-[var(--surface-muted)]">
                    <SafeImage
                      sources={[place.cover_media_url, place.cover_image_url]}
                      alt={place.name}
                      ratio="1 / 1"
                      className="group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--ink)] truncate group-hover:underline">
                      {place.name}
                    </p>
                    <p className="text-xs text-[var(--ink-faint)] truncate mt-0.5">
                      {place.category?.name ?? "Địa điểm"}
                      {extractDistrict(place.address) ? ` · ${extractDistrict(place.address)}` : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card overflow-hidden">
          <Link
            to="/map"
            className="discover-side__map flex flex-col items-center justify-center gap-2 h-40 bg-[var(--accent-soft)] hover:bg-[var(--accent)] hover:text-[var(--on-accent)] text-[var(--accent)] transition-colors"
            aria-label="Xem bản đồ địa điểm"
          >
            <MapPin size={28} aria-hidden />
            <span className="text-sm font-semibold">Xem trên bản đồ</span>
            <span className="text-xs opacity-80">Bản đồ Đà Nẵng tương tác</span>
          </Link>
        </section>
      </aside>
    </div>
  );
}
