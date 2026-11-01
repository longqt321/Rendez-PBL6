import { Link } from "react-router";
import { ArrowRight, Compass, MapPin, Search, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useCategories, useFeed, usePlaces } from "../../lib/api/queries";
import { useMe } from "../../lib/session";
import { AsyncState } from "../../components/ui/states";
import { Button } from "../../components/ui/button";
import { PlaceCard } from "../places/PlaceCard";
import { ExperienceCard } from "../experiences/ExperienceCard";
import { DiscoveryPrompt } from "./DiscoveryPrompt";
import { SafeImage } from "../../components/ui/safe-image";
import type { VisualPlace } from "../../lib/api/types";

/**
 * Discover.
 *
 * The homepage answers "what is here?" before it asks "what do you want?".
 * Structure, top to bottom:
 *
 *   1. Editorial intro + search entry   — establishes the product
 *   2. Contextual prompts              — converts a vague mood into a query
 *   3. Places worth a detour           — place-first, editorially framed
 *   4. Fresh from the community        — experience-first, shows activity
 *   5. Browse by category              — a second, cheaper entry point
 *
 * Every section is driven by real API data and disappears when it has nothing
 * to show, so an empty database never renders a hollow shell.
 */
export function DiscoverPage() {
  const me = useMe();
  const userId = me.data?.id;

  const recentPlaces = usePlaces("sort=recent&page_size=8", userId);
  const feed = useFeed("page_size=12", userId);
  const categories = useCategories();

  const places = useMemo(
    () => recentPlaces.data?.results ?? [],
    [recentPlaces.data],
  );
  const experiences = useMemo(
    () => feed.data?.pages.flatMap((page) => page.results) ?? [],
    [feed.data],
  );

  // A place that already anchors a cover image makes a better hero than the
  // first row of a grid, so the lead place is pulled out of the grid.
  const [lead, ...rest] = places;

  const hasNothing =
    !recentPlaces.isPending &&
    !feed.isPending &&
    places.length === 0 &&
    experiences.length === 0;

  return (
    <div className="discover">
      <section className="discover-hero" aria-labelledby="discover-title">
        <p className="eyebrow">
          <Compass size={13} aria-hidden />
          Sổ tay thành phố · Đà Nẵng
        </p>
        <h1 id="discover-title" className="discover-hero__title">
          Tìm nơi đáng để
          <br />
          dành một buổi chiều.
        </h1>
        <p className="lede discover-hero__lede">
          Mỗi địa điểm ở đây đều có người đã đến, chụp lại và kể lại. Không phải
          danh sách quảng cáo — mà là kinh nghiệm của cộng đồng.
        </p>
        <div className="discover-hero__actions">
          <Button asChild size="lg">
            <Link to="/search">
              <Search size={18} aria-hidden />
              Tìm địa điểm
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/map">
              <MapPin size={18} aria-hidden />
              Xem trên bản đồ
            </Link>
          </Button>
        </div>
      </section>

      <DiscoveryPrompt />

      {hasNothing ? (
        <AsyncState
          empty="Chưa có địa điểm nào được chia sẻ"
          emptyBody="Khi cộng đồng đăng ảnh đầu tiên, địa điểm sẽ xuất hiện ở đây."
          emptyIcon={<Sparkles size={24} aria-hidden />}
          emptyActions={
            <Button asChild>
              <Link to="/create">Đăng trải nghiệm đầu tiên</Link>
            </Button>
          }
        />
      ) : (
        <>
          <section
            className="discover-section"
            aria-labelledby="places-heading"
          >
            <header className="section-head">
              <div>
                <p className="eyebrow">Địa điểm</p>
                <h2
                  id="places-heading"
                  className="editorial section-head__title"
                >
                  Đáng một chuyến đi
                </h2>
              </div>
              <Link className="section-head__link" to="/search">
                Xem tất cả
                <ArrowRight size={15} aria-hidden />
              </Link>
            </header>

            <AsyncState
              pending={recentPlaces.isPending}
              error={recentPlaces.data ? null : recentPlaces.error}
              onRetry={() => void recentPlaces.refetch()}
              empty={
                places.length === 0 ? "Chưa có địa điểm nào được chia sẻ" : null
              }
              loadingVariant="grid"
            />

            {lead && (
              <div className="discover-lead">
                <FeaturePlace place={lead} />
                {rest.length > 0 && (
                  <div className="discover-lead__grid">
                    {rest.slice(0, 4).map((place) => (
                      <PlaceCard key={place.id} place={place} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {experiences.length > 0 && (
            <section
              className="discover-section"
              aria-labelledby="experiences-heading"
            >
              <header className="section-head">
                <div>
                  <p className="eyebrow">Từ cộng đồng</p>
                  <h2
                    id="experiences-heading"
                    className="editorial section-head__title"
                  >
                    Người khác đã thấy gì
                  </h2>
                </div>
                <Link className="section-head__link" to="/posts">
                  Xem tất cả
                  <ArrowRight size={15} aria-hidden />
                </Link>
              </header>

              <AsyncState
                pending={feed.isPending}
                error={feed.data ? null : feed.error}
                onRetry={() => void feed.refetch()}
              />

              {experiences.length > 0 && (
                <div className="card-grid">
                  {experiences.slice(0, 8).map((item, index) => (
                    <ExperienceCard
                      key={item.photo.id}
                      item={item}
                      eager={index < 2}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {categories.data && categories.data.length > 1 && (
            <section
              className="discover-section"
              aria-labelledby="categories-heading"
            >
              <header className="section-head">
                <div>
                  <p className="eyebrow">Theo loại</p>
                  <h2
                    id="categories-heading"
                    className="editorial section-head__title"
                  >
                    Bạn đang tìm gì?
                  </h2>
                </div>
              </header>
              <ul className="category-list" role="list">
                {categories.data.map((category) => (
                  <li key={category.slug}>
                    <Link
                      className="category-link"
                      to={"/search?category=" + category.slug}
                    >
                      <span>{category.name}</span>
                      <ArrowRight size={16} aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** The single largest place treatment on the page. */
function FeaturePlace({ place }: { place: VisualPlace }) {
  return (
    <article className="feature-place">
      <Link
        className="feature-place__media"
        to={"/places/" + place.id}
        aria-label={"Xem địa điểm " + place.name}
      >
        <SafeImage
          sources={[place.cover_media_url, place.cover_image_url]}
          alt={place.name}
          ratio="16 / 10"
          eager
        />
      </Link>
      <div className="feature-place__body">
        <p className="eyebrow">{place.category.name}</p>
        <h3 className="editorial feature-place__title">
          <Link to={"/places/" + place.id}>{place.name}</Link>
        </h3>
        <p className="feature-place__address">
          <MapPin size={14} aria-hidden />
          <span>{place.address}</span>
        </p>
        <Button asChild variant="outline">
          <Link to={"/places/" + place.id}>
            Xem địa điểm
            <ArrowRight size={15} aria-hidden />
          </Link>
        </Button>
      </div>
    </article>
  );
}
