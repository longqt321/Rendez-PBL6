import { useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Plus,
} from "lucide-react";
import {
  usePlace,
  usePlaceGallery,
  useSimilarPhotos,
} from "../../lib/api/queries";
import { useMe } from "../../lib/session";
import { directionsUrl, formatDate, shortAddress } from "../../lib/format";
import { AsyncState } from "../../components/ui/states";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/primitives";
import { SafeImage } from "../../components/ui/safe-image";
import { SavePlaceButton } from "../places/PlaceCard";
import { ExperienceTile } from "../experiences/ExperienceCard";
import { ReportDialog } from "../moderation/ReportDialog";

/**
 * Place detail.
 *
 * Structure mirrors how someone actually evaluates a place:
 *   identity → what it looks like → what the community found → practical info
 *   → where it is → what else is nearby.
 *
 * Only fields present in the API are rendered. There is no invented fallback
 * for opening hours, price or contact details: an absent field is shown as
 * absent, because a plausible-looking guess is worse than no answer.
 */
export function PlaceDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const me = useMe();
  const place = usePlace(id, me.data?.id);

  const backTo =
    (location.state as { from?: string } | null)?.from ?? "/discover";

  if (!place.data) {
    return (
      <AsyncState
        pending={place.isPending}
        error={place.error}
        onRetry={() => void place.refetch()}
        returnTo={location.pathname}
      />
    );
  }

  const data = place.data;
  const cover = data.cover_media_url ?? data.cover_image_url;
  const hasCoordinates = data.latitude !== null && data.longitude !== null;

  return (
    <article className="place-detail">
      <Link className="back-link" to={backTo}>
        <ArrowLeft size={16} aria-hidden />
        Quay lại
      </Link>

      <header className="place-detail__head">
        <div className="place-detail__identity">
          <p className="eyebrow">{data.category.name}</p>
          <h1 className="place-detail__title">{data.name}</h1>
          <p className="place-detail__address">
            <MapPin size={15} aria-hidden />
            <span>{data.address}</span>
          </p>

          <div className="place-detail__badges">
            {data.opening_hours && (
              <Badge tone="neutral">
                <Clock size={12} aria-hidden />
                {data.opening_hours.text}
              </Badge>
            )}
            {data.verified_at && (
              <Badge tone="success">
                <CheckCircle2 size={12} aria-hidden />
                Thông tin đã đối chiếu {formatDate(data.verified_at)}
              </Badge>
            )}
          </div>

          <div className="place-detail__actions">
            <SavePlaceButton place={data} />
            <Button asChild variant="outline">
              <a
                href={directionsUrl(data)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation size={16} aria-hidden />
                Chỉ đường
              </a>
            </Button>
            {hasCoordinates && (
              <Button asChild variant="outline">
                <Link
                  to={`/map?lat=${data.latitude}&lng=${data.longitude}&zoom=16&selected=${data.id}`}
                >
                  <MapPin size={16} aria-hidden />
                  Xem trên bản đồ
                </Link>
              </Button>
            )}
            <Button asChild>
              <Link to={"/create?place=" + data.id}>
                <Plus size={16} aria-hidden />
                Thêm trải nghiệm
              </Link>
            </Button>
          </div>
        </div>

        <div className="place-detail__cover">
          <SafeImage sources={[cover]} alt={data.name} ratio="4 / 3" eager />
        </div>
      </header>

      {data.description && (
        <section
          className="place-detail__section"
          aria-labelledby="about-heading"
        >
          <h2 id="about-heading" className="section-title">
            Về địa điểm này
          </h2>
          <p className="prose">{data.description}</p>
        </section>
      )}

      <CommunityExperiences placeId={data.id} posts={data.posts} />

      <PlaceGallery placeId={data.id} initialCount={data.photos.count} />

      <section className="place-detail__section" aria-labelledby="info-heading">
        <h2 id="info-heading" className="section-title">
          Thông tin thực tế
        </h2>
        <dl className="info-list">
          <div>
            <dt>Địa chỉ</dt>
            <dd>{data.address}</dd>
          </div>
          <div>
            <dt>Khu vực</dt>
            <dd>{shortAddress(data.address) || "Chưa xác định"}</dd>
          </div>
          <div>
            <dt>Giờ hoạt động</dt>
            <dd>
              {data.opening_hours ? (
                <>
                  {data.opening_hours.text}
                  <span className="info-list__note">
                    Nguồn: {data.opening_hours.source}
                    {data.opening_hours.verified_at
                      ? ` · Đối chiếu ${formatDate(data.opening_hours.verified_at)}`
                      : ""}
                  </span>
                </>
              ) : (
                <span className="info-list__unknown">
                  Chưa có giờ hoạt động được xác minh
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt>Vị trí</dt>
            <dd>
              {hasCoordinates ? (
                `${data.latitude}, ${data.longitude}`
              ) : (
                <span className="info-list__unknown">
                  Chưa có toạ độ chính xác
                </span>
              )}
            </dd>
          </div>
        </dl>

        <div className="place-detail__meta-actions">
          {data.source_url && (
            <a
              className="inline-link"
              href={data.source_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ArrowUpRight size={14} aria-hidden />
              Nguồn thông tin
            </a>
          )}
          <ReportDialog kind="places" id={data.id} />
        </div>
      </section>

      <RelatedPlaces placeId={data.id} photoId={data.photos.results[0]?.id} />
    </article>
  );
}

/** Posts attached to this place — the community's own words and photos. */
function CommunityExperiences({
  placeId,
  posts,
}: {
  placeId: string;
  posts: {
    id: string;
    author_name: string;
    caption?: string;
    media: { id: string; media_url: string }[];
  }[];
}) {
  if (!posts || posts.length === 0) {
    return (
      <section
        className="place-detail__section"
        aria-labelledby="experiences-heading"
      >
        <h2 id="experiences-heading" className="section-title">
          Trải nghiệm của cộng đồng
        </h2>
        <p className="muted">
          Chưa có ai chia sẻ trải nghiệm tại đây.{" "}
          <Link className="inline-link" to={"/create?place=" + placeId}>
            Bạn có thể là người đầu tiên
          </Link>
          .
        </p>
      </section>
    );
  }

  return (
    <section
      className="place-detail__section"
      aria-labelledby="experiences-heading"
    >
      <div className="section-head">
        <div>
          <p className="eyebrow">Cộng đồng</p>
          <h2
            id="experiences-heading"
            className="editorial section-head__title"
          >
            Trải nghiệm tại đây
          </h2>
        </div>
      </div>
      <ul className="post-list" role="list">
        {posts.map((post) => (
          <li key={post.id}>
            <Link className="post-card" to={"/posts/" + post.id}>
              {post.media[0] && (
                <SafeImage
                  sources={[post.media[0].media_url]}
                  alt={post.caption || ""}
                  ratio="1 / 1"
                  className="post-card__media"
                />
              )}
              <div className="post-card__body">
                <p className="post-card__author">{post.author_name}</p>
                {post.caption && (
                  <p className="post-card__caption line-clamp-2">
                    {post.caption}
                  </p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Paginated community gallery for this place. */
function PlaceGallery({
  placeId,
  initialCount,
}: {
  placeId: string;
  initialCount: number;
}) {
  const [page, setPage] = useState(1);
  const location = useLocation();
  const gallery = usePlaceGallery(placeId, "page=" + page);

  if (initialCount === 0) return null;

  return (
    <section
      className="place-detail__section"
      aria-labelledby="gallery-heading"
    >
      <div className="section-head">
        <div>
          <p className="eyebrow">Thư viện</p>
          <h2 id="gallery-heading" className="editorial section-head__title">
            Ảnh từ cộng đồng
          </h2>
        </div>
        <span className="muted small tabular">{initialCount} ảnh</span>
      </div>

      <AsyncState
        pending={gallery.isPending}
        error={gallery.data ? null : gallery.error}
        onRetry={() => void gallery.refetch()}
        loadingVariant="grid"
      />

      {gallery.data && gallery.data.results.length > 0 && (
        <ul className="gallery-grid" role="list">
          {gallery.data.results.map((photo) => (
            <li key={photo.id}>
              <Link
                className="gallery-grid__item"
                to={"/photos/" + photo.id}
                // Hand the photo page its origin so "Quay lại" returns to this
                // place instead of dropping the visitor on the homepage.
                state={{ from: location.pathname }}
                aria-label={
                  "Xem ảnh" + (photo.caption ? ": " + photo.caption : "")
                }
              >
                <SafeImage
                  sources={[photo.url]}
                  alt={photo.alt_text || photo.caption || "Ảnh địa điểm"}
                  ratio={
                    photo.width && photo.height
                      ? `${photo.width} / ${photo.height}`
                      : "1 / 1"
                  }
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {gallery.data && (gallery.data.next || gallery.data.previous) && (
        <div className="pagination">
          <Button
            variant="outline"
            size="sm"
            disabled={!gallery.data.previous}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Trang trước
          </Button>
          <span className="tabular">Trang {page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!gallery.data.next}
            onClick={() => setPage((current) => current + 1)}
          >
            Trang sau
          </Button>
        </div>
      )}
    </section>
  );
}

/** Other places surfaced from a photo of this one. */
function RelatedPlaces({
  placeId,
  photoId,
}: {
  placeId: string;
  photoId: string | undefined;
}) {
  const me = useMe();
  const similar = useSimilarPhotos(photoId, me.data?.id);

  if (!similar.data || similar.data.length === 0) return null;

  const related = similar.data
    .filter((item) => item.place.id !== placeId)
    .slice(0, 4);

  if (related.length === 0) return null;

  return (
    <section
      className="place-detail__section"
      aria-labelledby="related-heading"
    >
      <div className="section-head">
        <div>
          <p className="eyebrow">Gần đây</p>
          <h2 id="related-heading" className="editorial section-head__title">
            Có thể bạn cũng thích
          </h2>
        </div>
      </div>
      <ul className="related-grid" role="list">
        {related.map((item) => (
          <li key={item.photo.id}>
            <ExperienceTile item={item} from={"/places/" + placeId} />
            <Link
              className="related-grid__label"
              to={"/places/" + item.place.id}
            >
              {item.place.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
