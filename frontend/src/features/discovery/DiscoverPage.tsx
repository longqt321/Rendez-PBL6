import { Link } from "react-router";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useFeed, usePlaces } from "../../lib/api/queries";
import { useMe } from "../../lib/session";
import { AsyncState } from "../../components/ui/states";
import { Button } from "../../components/ui/button";
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
    <div className="discover">
      <header className="page-head discover-head">
        <div className="page-head__copy">
          <h1>Khám phá Đà Nẵng</h1>
          {placeCount != null && (
            <p className="muted small">{placeCount} địa điểm</p>
          )}
        </div>
        <Button asChild variant="outline">
          <Link to="/map">
            <MapPin size={16} aria-hidden />
            Bản đồ
          </Link>
        </Button>
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
          className="discover-section"
          aria-labelledby="experiences-heading"
        >
          <header className="section-head">
            <div>
              <h2
                id="experiences-heading"
                className="editorial section-head__title"
              >
                Bảng tin
              </h2>
            </div>
            <Link className="section-head__link" to="/posts">
              Xem bài viết
              <ArrowRight size={15} aria-hidden />
            </Link>
          </header>

          <AsyncState
            pending={feed.isPending}
            error={feed.data ? null : feed.error}
            onRetry={() => void feed.refetch()}
            loadingVariant="list"
          />

          {experiences.length > 0 && (
            <div className="discover-feed-list">
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
            <p className="muted small text-center" role="status">
              Đang tải thêm…
            </p>
          )}

          {feed.data && !hasNextPage && experiences.length > 0 && (
            <p className="muted small text-center">
              Bạn đã xem hết ảnh mới nhất.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
