import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import {
  ArrowLeft,
  MapPin,
  Flag,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Navigation,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  api,
  ApiError,
  date,
  discoveryQuery,
  type Page,
} from "../lib/api/client";
import type {
  FeedItem,
  PhotoDetail,
  PublicPhoto,
  VisualDetail,
  VisualPlace,
} from "../lib/api/visual";
import {
  PhotoCredit,
  ShareButton,
  OwnPhotoControls,
  LikeButton,
  CommentSection,
} from "./social";
import { MasonryFeed } from "./masonry";
import { Button } from "../components/ui/button";
import {
  Cover,
  ErrorText,
  Filters,
  Pager,
  PlaceCard,
  SaveButton,
  State,
  useMe,
  googleMapsDirectionsUrl,
  AttributeIcon,
} from "./shared";

function PhotoImage({
  photo,
  full = false,
}: {
  photo: PublicPhoto;
  full?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div
        className={
          full ? "placeholder viewer-image" : "placeholder platform-photo"
        }
      >
        Không tải được ảnh
      </div>
    );
  return (
    <img
      className={full ? "viewer-image" : "card-image platform-photo"}
      src={photo.url}
      alt={photo.alt_text || photo.caption || "Ảnh địa điểm"}
      width={photo.width}
      height={photo.height}
      style={
        photo.width && photo.height
          ? { aspectRatio: `${photo.width} / ${photo.height}` }
          : { aspectRatio: "3 / 4", minHeight: "220px" }
      }
      loading={full ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={full ? "high" : "auto"}
      onError={() => setFailed(true)}
    />
  );
}

function extractDistrict(address: string): string | null {
  const match = address.match(
    /(Hải Châu|Thanh Khê|Sơn Trà|Ngũ Hành Sơn|Liên Chiểu|Cẩm Lệ|Hòa Vang)/i,
  );
  return match ? match[1] : null;
}

export function PhotoCard({
  photo,
  place,
  from,
}: {
  photo: PublicPhoto;
  place: VisualPlace;
  from: string;
}) {
  const district = extractDistrict(place.address);
  const displayAttrs = photo.attributes?.slice(0, 2) || [];

  return (
    <article className="place-card photo-card">
      <div className="pin-body">
        <div className="photo-card-media">
          <SaveButton place={place} compact />
          <Link
            to={"/photos/" + photo.id}
            state={{ from }}
            aria-label={"Xem ảnh của " + place.name}
          >
            <PhotoImage photo={photo} />
            <span className="photo-open">
              Xem ảnh <ArrowUpRight size={17} aria-hidden />
            </span>
          </Link>
        </div>
        <div className="card-copy">
          <Link
            to={"/places/" + place.id}
            state={{ from }}
            className="photo-card-place-link"
            aria-label={"Xem chi tiết quán " + place.name}
          >
            <h2>{place.name}</h2>
          </Link>
          <div className="card-meta-line">
            {district && <span className="card-district-chip">{district}</span>}
            <p className="muted small card-address-text">
              <MapPin size={12} aria-hidden />
              <span>{place.address.replace(/,?\s*Đà Nẵng\s*$/i, "")}</span>
            </p>
          </div>
          {displayAttrs.length > 0 && (
            <div
              className="card-micro-attributes"
              aria-label="Đặc điểm không gian"
            >
              {displayAttrs.map((attr) => (
                <span
                  key={attr.code}
                  className="card-micro-chip"
                  title={attr.description}
                >
                  <AttributeIcon code={attr.code} size={11} />
                  <span>{attr.display_name_vi}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function SimilarPlaces({ photoId }: { photoId: string }) {
  const location = useLocation(),
    me = useMe();
  const result = useQuery({
    queryKey: ["similar-places", photoId, me.data?.id],
    queryFn: ({ signal }) =>
      api<FeedItem[]>("photos/" + photoId + "/similar/", { signal }),
  });
  if (result.isPending || result.data?.length === 0) return null;
  return (
    <section className="similar-places" aria-labelledby="similar-heading">
      <h2 id="similar-heading">Địa điểm tương tự</h2>
      <State error={result.error} onRetry={() => void result.refetch()} />
      {result.data && (
        <MasonryFeed className="pin-feed">
          {result.data.map(({ photo, place }) => (
            <PhotoCard
              key={place.id}
              photo={photo}
              place={place}
              from={location.pathname + location.search}
            />
          ))}
        </MasonryFeed>
      )}
    </section>
  );
}

function mapLocationQuery(query: string, place: VisualPlace) {
  const next = new URLSearchParams(query);
  next.delete("page");
  next.set("lat", String(place.latitude));
  next.set("lng", String(place.longitude));
  next.set("zoom", "16");
  next.set("selected", place.id);
  return next.toString();
}
export function Discover({ saved = false }: { saved?: boolean }) {
  const [params] = useSearchParams(),
    me = useMe(),
    location = useLocation();
  const query = discoveryQuery(params).toString();
  const feed = useInfiniteQuery({
    queryKey: ["feed", query, me.data?.id],
    initialPageParam: params.get("page") || "1",
    queryFn: ({ signal, pageParam }) => {
      const next = new URLSearchParams(query);
      next.set("page", pageParam);
      return api<Page<FeedItem>>("feed/?" + next, { signal });
    },
    getNextPageParam: (lastPage) =>
      lastPage.next
        ? new URL(lastPage.next, window.location.origin).searchParams.get(
            "page",
          ) || undefined
        : undefined,
    enabled: !saved,
  });
  const favorites = useQuery({
    queryKey: ["favorites", query, me.data?.id],
    queryFn: ({ signal }) =>
      api<Page<VisualPlace>>("favorites/?" + query, { signal }),
    enabled: saved && !!me.data,
  });
  const result = saved ? favorites : feed;
  const photos = feed.data?.pages.flatMap((page) => page.results) || [];
  const count = saved ? favorites.data?.count : feed.data?.pages[0]?.count;
  const items = saved ? favorites.data?.results : photos;
  const FeedLayout = saved ? "div" : MasonryFeed;
  const loaded = !!result.data;
  const scrollKey = (saved ? "saved" : "discover") + query;
  useEffect(() => {
    if (loaded) {
      const target = sessionStorage.getItem(scrollKey);
      if (target) window.scrollTo(0, Number(target));
    }
  }, [scrollKey, loaded]);
  useEffect(
    () => () => {
      sessionStorage.setItem(scrollKey, String(window.scrollY));
    },
    [scrollKey],
  );
  if (saved && me.isPending) return <State pending />;
  if (saved && me.isError)
    return <State error={me.error} onRetry={() => void me.refetch()} />;
  if (saved && !me.data)
    return (
      <section className="state">
        <h1>Đã lưu</h1>
        <p>Đăng nhập để xem địa điểm đã lưu.</p>
        <Button asChild>
          <Link to="/login" state={{ returnTo: "/saved" }}>
            Đăng nhập
          </Link>
        </Button>
      </section>
    );
  return (
    <>
      {saved ? (
        <header className="page-heading saved-heading">
          <div>
            <span className="page-badge">Bộ sưu tập cá nhân</span>
            <h1>Địa điểm đã lưu</h1>
            <p className="muted">
              Những quán cà phê và không gian yêu thích bạn đã lưu để ghé thăm.
            </p>
          </div>
        </header>
      ) : (
        <>
          <h1 className="sr-only">Khám phá Đà Nẵng</h1>
          {!(
            result.isError &&
            !result.data &&
            (!(result.error instanceof ApiError) || result.error.status >= 500)
          ) && <Filters compact />}
        </>
      )}
      <State
        pending={result.isPending}
        error={result.data ? null : result.error}
        onRetry={() => void result.refetch()}
        empty={
          items?.length === 0
            ? saved
              ? "Bạn chưa lưu địa điểm nào"
              : params.get("attributes")
                ? "Không có ảnh khớp tất cả đặc điểm đã chọn"
                : "Không tìm thấy ảnh phù hợp"
            : undefined
        }
      />
      {result.data && (count ?? 0) > 0 && (
        <>
          <div className="feed-context">
            <p className="result-count">
              {count} {saved ? "địa điểm đã lưu" : "khoảnh khắc · Đà Nẵng"}
            </p>
            {!saved && <span>Ảnh tư liệu & cộng đồng</span>}
          </div>
          <FeedLayout className={saved ? "place-grid" : "pin-feed"}>
            {saved
              ? favorites.data?.results.map((place) => (
                  <PlaceCard key={place.id} place={place} />
                ))
              : photos.map(({ photo, place }) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    place={place}
                    from={location.pathname + location.search}
                  />
                ))}
          </FeedLayout>
          {saved &&
          favorites.data &&
          (favorites.data.next || favorites.data.previous) ? (
            <Pager
              next={favorites.data.next}
              previous={favorites.data.previous}
            />
          ) : !saved ? (
            <div className="load-more">
              {feed.hasNextPage && (
                <Button
                  variant="outline"
                  disabled={feed.isFetchingNextPage}
                  onClick={() => void feed.fetchNextPage()}
                >
                  {feed.isFetchingNextPage ? "Đang tải ảnh…" : "Xem thêm ảnh"}
                </Button>
              )}
              {feed.isFetchNextPageError && <ErrorText error={feed.error} />}
              {!feed.hasNextPage && photos.length > 0 && (
                <p className="muted">
                  Đã hết ảnh. Chọn loại địa điểm khác hoặc đổi bộ lọc.
                </p>
              )}
            </div>
          ) : null}
          {!saved && (
            <Link className="floating-map" to={"/map?" + query}>
              <MapPin size={19} aria-hidden /> Xem bản đồ
            </Link>
          )}
        </>
      )}
    </>
  );
}
function ReportButton({
  kind,
  id,
  compact = false,
}: {
  kind: "photos" | "places";
  id: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false),
    dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    me = useMe(),
    navigate = useNavigate(),
    location = useLocation();
  const mutation = useMutation({
    mutationFn: (data: { reason: string; note: string }) =>
      api(kind + "/" + id + "/report/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  });
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else if (dialog.current?.open) dialog.current.close();
  }, [open]);
  return (
    <>
      <Button
        ref={trigger}
        variant="outline"
        aria-label="Báo cáo nội dung"
        title="Báo cáo nội dung"
        disabled={me.isPending || me.isError}
        onClick={() => {
          if (!me.data) {
            navigate("/login", {
              state: { returnTo: location.pathname + location.search },
            });
            return;
          }
          mutation.reset();
          setOpen(true);
        }}
      >
        <Flag size={16} aria-hidden />
        {!compact && "Báo cáo nội dung"}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={"report-title-" + id}
        onCancel={() => setOpen(false)}
        onClose={() => {
          setOpen(false);
          trigger.current?.focus();
        }}
        className="report-dialog"
      >
        <h2 id={"report-title-" + id}>Báo cáo nội dung</h2>
        {mutation.isSuccess ? (
          <p role="status">Đã nhận báo cáo.</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const values = new FormData(e.currentTarget);
              mutation.mutate({
                reason: String(values.get("reason")),
                note: String(values.get("note")),
              });
            }}
          >
            <label>
              Lý do
              <select name="reason">
                <option value="wrong_place">
                  Sai địa điểm hoặc sai thông tin
                </option>
                <option value="privacy">Xâm phạm quyền riêng tư</option>
                <option value="copyright">Vi phạm quyền sử dụng ảnh</option>
                <option value="unsafe">Nội dung không phù hợp</option>
                <option value="other">Khác</option>
              </select>
            </label>
            <label>
              Ghi chú (tùy chọn)
              <textarea name="note" maxLength={1000} />
            </label>
            <ErrorText error={mutation.error} />
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Đang gửi…" : "Gửi báo cáo"}
            </Button>
          </form>
        )}
        <Button variant="outline" onClick={() => setOpen(false)}>
          Đóng
        </Button>
      </dialog>
    </>
  );
}
function Gallery({
  placeId,
  query,
  initial,
}: {
  placeId: string;
  query: string;
  initial: Page<PublicPhoto>;
}) {
  const [page, setPage] = useState(1);
  const photos = useQuery({
    queryKey: ["gallery", placeId, query, page],
    queryFn: ({ signal }) =>
      api<Page<PublicPhoto>>(
        "places/" + placeId + "/photos/?" + query + "&page=" + page,
        { signal },
      ),
    initialData: page === 1 ? initial : undefined,
  });
  return (
    <>
      <State
        pending={photos.isPending}
        error={photos.error}
        onRetry={() => void photos.refetch()}
        empty={photos.data?.count === 0 ? "Chưa có ảnh công khai" : undefined}
      />
      <div className="gallery-grid">
        {photos.data?.results.map((p) => (
          <Link
            key={p.id}
            to={"/photos/" + p.id + "?" + query}
            state={{
              from: "/places/" + placeId + "?" + query,
            }}
            aria-label={"Xem ảnh " + (p.caption || "cộng đồng")}
          >
            <PhotoImage photo={p} />
          </Link>
        ))}
      </div>
      {photos.data && (
        <div className="pager">
          <Button
            variant="outline"
            disabled={!photos.data.previous}
            onClick={() => setPage(page - 1)}
          >
            Trang trước
          </Button>
          <span>Trang {page}</span>
          <Button
            variant="outline"
            disabled={!photos.data.next}
            onClick={() => setPage(page + 1)}
          >
            Trang sau
          </Button>
        </div>
      )}
    </>
  );
}
export function PlaceDetailPage() {
  const { id } = useParams(),
    location = useLocation(),
    me = useMe();
  const suffix = "";
  const result = useQuery({
    queryKey: ["place", id, suffix, me.data?.id],
    queryFn: ({ signal }) =>
      api<VisualDetail>("places/" + id + "/?" + suffix, { signal }),
  });
  const from =
    (location.state as { from?: string } | null)?.from || "/discover?" + suffix;
  if (!result.data)
    return (
      <State
        pending={result.isPending}
        error={result.error}
        onRetry={() => void result.refetch()}
      />
    );
  const place = result.data;
  return (
    <>
      <header className="place-header">
        <div>
          <div className="place-status-badges">
            <span className="eyebrow" style={{ margin: 0 }}>
              {place.category.name}
            </span>
            {place.verified_at && (
              <span className="place-verified-badge">
                <CheckCircle2 size={12} /> Đã xác thực
              </span>
            )}
            {place.opening_hours && (
              <span className="place-hours-badge">
                <Clock size={12} /> {place.opening_hours.text}
              </span>
            )}
          </div>
          <h1>{place.name}</h1>
          <p className="muted">
            <MapPin size={16} aria-hidden /> {place.address}
          </p>
          <div className="detail-actions">
            <SaveButton place={place} />
            <Button asChild variant="outline">
              <a
                href={googleMapsDirectionsUrl(place)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation size={15} aria-hidden />
                Chỉ đường
              </a>
            </Button>
            {place.latitude !== null && place.longitude !== null && (
              <Button asChild variant="outline">
                <Link to={"/map?" + mapLocationQuery("", place)}>
                  <MapPin size={16} aria-hidden />
                  Xem trên bản đồ
                </Link>
              </Button>
            )}
            {place.source_url && (
              <Button asChild variant="outline">
                <a
                  href={place.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ArrowUpRight size={15} aria-hidden />
                  Trang của quán
                </a>
              </Button>
            )}
            <ShareButton />
            <Button asChild>
              <Link to={"/submissions/new?place=" + place.id}>Đăng ảnh</Link>
            </Button>
          </div>
        </div>
        <div className="place-cover">
          <Cover place={place} className="detail-cover" />
          <Link
            className="viewer-back"
            to={from}
            aria-label="Quay lại"
            title="Quay lại"
          >
            <ArrowLeft size={20} aria-hidden />
          </Link>
        </div>
      </header>
      <section className="panel">
        <h2>Thông tin địa điểm</h2>
        {place.description && <p>{place.description}</p>}
        <p>
          <strong>Địa chỉ:</strong> {place.address}
        </p>
        <p>
          <strong>Giờ hoạt động:</strong>{" "}
          {place.opening_hours
            ? place.opening_hours.text
            : "06:30 – 22:30 hàng ngày"}
        </p>
        {place.opening_hours && (
          <p className="muted small">
            Nguồn: {place.opening_hours.source} · Đối chiếu:{" "}
            {date(place.opening_hours.verified_at)}
          </p>
        )}
        {place.latitude === null && (
          <p className="muted">Chưa có vị trí chính xác trên bản đồ.</p>
        )}

        <div className="merchant-claim-box">
          <div className="merchant-claim-header">
            <Sparkles size={16} />
            <strong>Dành cho chủ quán & quản lý</strong>
          </div>
          <p className="muted small" style={{ margin: "4px 0 8px 0" }}>
            Bạn là chủ sở hữu hoặc quản lý của <strong>{place.name}</strong>?
            Liên hệ để xác nhận quyền quản lý và cập nhật thông tin quán.
          </p>
          <a
            href={`mailto:partner@rendez.local?subject=Yeu%20cau%20quan%20tri%20quan%20${encodeURIComponent(place.name)}`}
            className="merchant-claim-link"
          >
            Liên hệ xác nhận quyền quản lý quán →
          </a>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <ReportButton kind="places" id={place.id} />
        </div>
      </section>
      <section className="panel">
        <div className="page-heading">
          <h2>Ảnh tại địa điểm</h2>
        </div>
        <Gallery
          key={id + suffix}
          placeId={id!}
          query={suffix}
          initial={place.photos}
        />
      </section>
    </>
  );
}
export function PhotoDetailPage() {
  const { id } = useParams(),
    [params] = useSearchParams(),
    location = useLocation(),
    navigate = useNavigate(),
    me = useMe();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [id]);
  const result = useQuery({
    queryKey: ["photo", id, params.get("attributes"), me.data?.id],
    queryFn: ({ signal }) =>
      api<PhotoDetail>("photos/" + id + "/?" + discoveryQuery(params), {
        signal,
      }),
  });

  const photoNavigation = location.state as {
    from?: string;
  } | null;
  const photoIds = useMemo(
    () => result.data?.photo_ids || [],
    [result.data?.photo_ids],
  );
  const photoIndex = id ? photoIds.indexOf(id) : -1;
  const from =
    (location.state as { from?: string } | null)?.from ||
    (result.data ? "/places/" + result.data.place_id : "/discover");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      )
        return;
      if (e.key === "ArrowLeft" && photoIndex > 0) {
        navigate("/photos/" + photoIds[photoIndex - 1] + location.search, {
          state: photoNavigation,
        });
      } else if (
        e.key === "ArrowRight" &&
        photoIndex >= 0 &&
        photoIndex < photoIds.length - 1
      ) {
        navigate("/photos/" + photoIds[photoIndex + 1] + location.search, {
          state: photoNavigation,
        });
      } else if (e.key === "Escape") {
        navigate(from);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photoIndex, photoIds, location.search, photoNavigation, from, navigate]);

  if (!result.data)
    return (
      <State
        pending={result.isPending}
        error={result.error}
        onRetry={() => void result.refetch()}
      />
    );
  const photo = result.data;
  return (
    <>
      <section className="photo-viewer">
        <div className="viewer-stage">
          <PhotoImage key={photo.id} photo={photo} full />
          <Link
            className="viewer-back"
            to={from}
            aria-label="Quay lại"
            title="Quay lại"
          >
            <ArrowLeft size={20} aria-hidden />
          </Link>
          {photoIndex > 0 && (
            <Link
              className="viewer-arrow previous"
              aria-label="Xem ảnh trước"
              to={"/photos/" + photoIds[photoIndex - 1] + location.search}
              state={photoNavigation}
            >
              <ChevronLeft size={23} />
            </Link>
          )}
          {photoIndex >= 0 && photoIndex < photoIds.length - 1 && (
            <Link
              className="viewer-arrow next"
              aria-label="Xem ảnh tiếp theo"
              to={"/photos/" + photoIds[photoIndex + 1] + location.search}
              state={photoNavigation}
            >
              <ChevronRight size={23} />
            </Link>
          )}
          {photoIndex >= 0 && (
            <span className="viewer-counter">
              {photoIndex + 1} / {photoIds.length}
            </span>
          )}
        </div>
        <div className="viewer-copy">
          <Link
            className="photo-place-link"
            to={"/places/" + photo.place_id}
            state={{ from: location.pathname + location.search }}
            aria-label={"Thông tin địa điểm " + photo.place.name}
          >
            <h1>{photo.place.name}</h1>
            <ChevronRight size={21} aria-hidden />
          </Link>
          {photo.caption && photo.caption !== photo.place.name && (
            <p className="viewer-caption">{photo.caption}</p>
          )}
          <Link
            className="viewer-address"
            to={"/places/" + photo.place_id}
            state={{ from: location.pathname + location.search }}
          >
            <MapPin size={16} aria-hidden /> {photo.place.address}
          </Link>
          <PhotoCredit photo={photo} />
          <div className="detail-actions photo-actions">
            <LikeButton key={photo.id} photoId={photo.id} />
            <SaveButton place={photo.place} compact />
            <Button asChild variant="outline">
              <a
                href={googleMapsDirectionsUrl(photo.place)}
                target="_blank"
                rel="noopener noreferrer"
                title="Chỉ đường trên Google Maps"
              >
                <Navigation size={15} aria-hidden />
                Chỉ đường
              </a>
            </Button>
            <ShareButton compact />
            <ReportButton kind="photos" id={photo.id} compact />
          </div>
          <OwnPhotoControls photo={photo} />
          <CommentSection key={photo.id} photoId={photo.id} />
        </div>
      </section>
      <SimilarPlaces key={photo.id} photoId={photo.id} />
    </>
  );
}
