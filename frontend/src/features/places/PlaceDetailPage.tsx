import { useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { ArrowLeft, Clock, MapPin, Navigation, Plus } from "lucide-react";
import {
  usePlace,
  usePlaceGallery,
  useSimilarPhotos,
} from "../../lib/api/queries";
import { useMe } from "../../lib/session";
import { directionsUrl, shortAddress } from "../../lib/format";
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
    <article className="place-detail max-w-5xl mx-auto px-4 py-6 flex flex-col gap-8">
      <Link className="back-link inline-flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100" to={backTo}>
        <ArrowLeft size={16} aria-hidden />
        Quay lại
      </Link>

      <header className="place-detail__head grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="place-detail__identity flex flex-col gap-4">
          <h1 className="place-detail__title text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{data.name}</h1>
          <p className="place-detail__address flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400">
            <MapPin size={15} aria-hidden />
            <span>{data.address}</span>
          </p>

          <div className="place-detail__badges flex flex-wrap gap-2">
            {data.opening_hours && (
              <Badge tone="neutral">
                <Clock size={12} aria-hidden />
                {data.opening_hours.text}
              </Badge>
            )}
          </div>

          <div className="place-detail__actions flex flex-wrap items-center gap-2.5 pt-2">
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
                Đăng ảnh
              </Link>
            </Button>
          </div>
        </div>

        <div className="place-detail__cover rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
          <SafeImage sources={[cover]} alt={data.name} ratio="4 / 3" eager />
        </div>
      </header>

      {data.description && (
        <section
          className="place-detail__section flex flex-col gap-3 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
          aria-labelledby="about-heading"
        >
          <h2 id="about-heading" className="section-title text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Về địa điểm này
          </h2>
          <p className="prose text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{data.description}</p>
        </section>
      )}

      <CommunityExperiences placeId={data.id} posts={data.posts} />

      <PlaceGallery placeId={data.id} initialCount={data.photos.count} />

      <section className="place-detail__section flex flex-col gap-4 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900" aria-labelledby="info-heading">
        <h2 id="info-heading" className="section-title text-lg font-bold text-neutral-900 dark:text-neutral-100">
          Thông tin thực tế
        </h2>
        <dl className="info-list grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex flex-col gap-1 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <dt className="text-xs font-medium text-neutral-400">Địa chỉ</dt>
            <dd className="font-semibold text-neutral-900 dark:text-neutral-100">{data.address}</dd>
          </div>
          <div className="flex flex-col gap-1 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <dt className="text-xs font-medium text-neutral-400">Khu vực</dt>
            <dd className="font-semibold text-neutral-900 dark:text-neutral-100">{shortAddress(data.address) || "Chưa xác định"}</dd>
          </div>
          <div className="flex flex-col gap-1 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <dt className="text-xs font-medium text-neutral-400">Giờ hoạt động</dt>
            <dd className="font-semibold text-neutral-900 dark:text-neutral-100">
              {data.opening_hours ? (
                data.opening_hours.text
              ) : (
                <span className="info-list__unknown text-neutral-400 font-normal">
                  Chưa có giờ hoạt động được xác minh
                </span>
              )}
            </dd>
          </div>
        </dl>

        <div className="place-detail__meta-actions pt-2 flex justify-end">
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
          Ảnh của cộng đồng
        </h2>
        <p className="muted">
          Chưa có ảnh nào ở đây.{" "}
          <Link className="inline-link" to={"/create?place=" + placeId}>
            Đăng ảnh đầu tiên
          </Link>
          .
        </p>
      </section>
    );
  }

  return (
    <section
      className="place-detail__section flex flex-col gap-4 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
      aria-labelledby="experiences-heading"
    >
      <div className="section-head flex items-center justify-between">
        <div>
          <h2
            id="experiences-heading"
            className="editorial section-head__title text-lg font-bold text-neutral-900 dark:text-neutral-100"
          >
            Ảnh mới nhất
          </h2>
        </div>
      </div>
      <ul className="post-list grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" role="list">
        {posts.map((post) => (
          <li key={post.id}>
            <Link className="post-card flex gap-3 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/30 group transition-all" to={"/posts/" + post.id}>
              {post.media[0] && (
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-neutral-100 dark:bg-neutral-800">
                  <SafeImage
                    sources={[post.media[0].media_url]}
                    alt={post.caption || ""}
                    ratio="1 / 1"
                    className="post-card__media group-hover:scale-105 transition-transform"
                  />
                </div>
              )}
              <div className="post-card__body flex-1 min-w-0 flex flex-col justify-center">
                <p className="post-card__author font-semibold text-xs text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 transition-colors">{post.author_name}</p>
                {post.caption && (
                  <p className="post-card__caption line-clamp-2 text-xs text-neutral-600 dark:text-neutral-400 mt-1">
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
      className="place-detail__section flex flex-col gap-4 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
      aria-labelledby="gallery-heading"
    >
      <div className="section-head flex items-center justify-between">
        <div>
          <h2 id="gallery-heading" className="editorial section-head__title text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Tất cả ảnh
          </h2>
        </div>
        <span className="muted small tabular text-xs text-neutral-400">{initialCount} ảnh</span>
      </div>

      <AsyncState
        pending={gallery.isPending}
        error={gallery.data ? null : gallery.error}
        onRetry={() => void gallery.refetch()}
        loadingVariant="grid"
      />

      {gallery.data && gallery.data.results.length > 0 && (
        <ul className="gallery-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" role="list">
          {gallery.data.results.map((photo) => (
            <li key={photo.id}>
              <Link
                className="gallery-grid__item group block rounded-xl overflow-hidden aspect-square bg-neutral-100 dark:bg-neutral-800"
                to={"/photos/" + photo.id}
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
                  className="group-hover:scale-105 transition-transform"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {gallery.data && (gallery.data.next || gallery.data.previous) && (
        <div className="pagination flex items-center justify-center gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <Button
            variant="outline"
            size="sm"
            disabled={!gallery.data.previous}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Trang trước
          </Button>
          <span className="tabular text-xs font-medium text-neutral-600 dark:text-neutral-400">Trang {page}</span>
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
      className="place-detail__section flex flex-col gap-4 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
      aria-labelledby="related-heading"
    >
      <div className="section-head flex items-center justify-between">
        <div>
          <h2 id="related-heading" className="editorial section-head__title text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Địa điểm gần đây
          </h2>
        </div>
      </div>
      <ul className="related-grid grid grid-cols-2 sm:grid-cols-4 gap-4" role="list">
        {related.map((item) => (
          <li key={item.photo.id} className="flex flex-col gap-1.5">
            <ExperienceTile item={item} from={"/places/" + placeId} />
            <Link
              className="related-grid__label text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-blue-600 truncate"
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
