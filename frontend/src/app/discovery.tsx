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
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { MasonryFeed } from "./masonry";
import { Button } from "../components/ui/button";
import {
  AttributeChips,
  Cover,
  ErrorText,
  Filters,
  Pager,
  PlaceCard,
  SaveButton,
  State,
  useMe,
} from "./shared";

function PhotoImage({
  photo,
  full = false,
}: {
  photo: PublicPhoto;
  full?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="placeholder">Không tải được ảnh</div>;
  return (
    <img
      className={full ? "viewer-image" : "card-image"}
      src={photo.url}
      alt={photo.alt_text || "Ảnh cộng đồng"}
      width={photo.width}
      height={photo.height}
      loading={full ? "eager" : "lazy"}
      onError={() => setFailed(true)}
    />
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
        <p>Đăng nhập để xem quán đã lưu.</p>
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
            <h1>Quán đã lưu</h1>
            <p className="muted">Xem lại địa chỉ và ảnh của quán đã lưu.</p>
          </div>
        </header>
      ) : (
        <>
          <h1 className="sr-only">Khám phá quán ở Đà Nẵng qua ảnh</h1>
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
              ? "Bạn chưa lưu quán nào"
              : params.get("attributes")
                ? "Không có ảnh khớp tất cả đặc điểm đã chọn"
                : "Không tìm thấy ảnh phù hợp"
            : undefined
        }
      />
      {result.data && (
        <>
          <div className="feed-context">
            <p className="result-count">
              {count} {saved ? "quán đã lưu" : "ảnh · Đà Nẵng"}
            </p>
            {!saved && <span>Ảnh từ cộng đồng</span>}
          </div>
          <FeedLayout className={saved ? "place-grid" : "pin-feed"}>
            {saved
              ? favorites.data?.results.map((place) => (
                  <PlaceCard key={place.id} place={place} />
                ))
              : photos.map(({ photo, place }) => (
                  <article className="place-card photo-card" key={photo.id}>
                    <div className="pin-body">
                      <div className="photo-card-media">
                        <SaveButton place={place} compact />
                        <Link
                          to={"/photos/" + photo.id + location.search}
                          state={{
                            from: location.pathname + location.search,
                            photoIds: photos.map((item) => item.photo.id),
                          }}
                          aria-label={"Xem ảnh của " + place.name}
                        >
                          <PhotoImage photo={photo} />
                          <span className="photo-open">
                            Xem ảnh <ArrowUpRight size={17} />
                          </span>
                        </Link>
                      </div>
                      <div className="card-copy">
                        <Link
                          to={"/places/" + place.id + location.search}
                          state={{
                            from: location.pathname + location.search,
                            photoId: photo.id,
                          }}
                        >
                          <h2>{place.name}</h2>
                        </Link>
                        <p className="muted small">{place.address}</p>
                        {photo.matched_attribute_codes.length > 0 && (
                          <p className="small">Đặc điểm khớp bộ lọc:</p>
                        )}
                        <AttributeChips
                          attributes={photo.attributes}
                          matched={photo.matched_attribute_codes}
                        />
                      </div>
                      {place.latitude !== null && place.longitude !== null && (
                        <Link
                          className="pin-map-link"
                          to={"/map?" + mapLocationQuery(query, place)}
                          aria-label={"Vị trí của " + place.name}
                        >
                          <MapPin size={15} aria-hidden /> Xem vị trí
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
          </FeedLayout>
          {saved && favorites.data ? (
            <Pager
              next={favorites.data.next}
              previous={favorites.data.previous}
            />
          ) : (
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
                  Đã hết ảnh. Chọn loại quán khác hoặc đổi bộ lọc.
                </p>
              )}
            </div>
          )}
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
function ReportButton({ kind, id }: { kind: "photos" | "places"; id: string }) {
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
        disabled={me.isPending || me.isError}
        onClick={() => {
          if (!me.data) {
            navigate("/login", {
              state: { returnTo: location.pathname + location.search },
            });
            return;
          }
          setOpen(true);
        }}
      >
        <Flag size={16} aria-hidden />
        Báo cáo nội dung
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
                <option value="wrong_place">Sai quán hoặc sai thông tin</option>
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
              Gửi báo cáo
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
              photoIds: photos.data?.results.map((item) => item.id),
            }}
            aria-label={"Xem ảnh " + (p.caption || "cộng đồng")}
          >
            <PhotoImage photo={p} />
            <AttributeChips
              attributes={p.attributes}
              matched={p.matched_attribute_codes}
            />
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
    [params] = useSearchParams(),
    location = useLocation(),
    me = useMe();
  const query = discoveryQuery(params);
  query.delete("page");
  const suffix = query.toString();
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
  const selectedPhoto = (location.state as { photoId?: string } | null)
    ?.photoId;
  const support =
    place.photos.results.find((p) => p.id === selectedPhoto) ||
    place.supporting_photo;
  return (
    <>
      <Link className="back-link" to={from}>
        <ArrowLeft size={18} aria-hidden />
        Quay lại
      </Link>
      {params.get("attributes") && support && (
        <section className="match-evidence panel">
          <div>
            <span className="eyebrow">Đặc điểm đã chọn</span>
            <h2>Ảnh khớp bộ lọc</h2>
            <AttributeChips
              attributes={support.attributes}
              matched={support.matched_attribute_codes}
            />
            <p className="muted small">Các đặc điểm nhìn thấy trong ảnh.</p>
          </div>
          <Link
            to={"/photos/" + support.id + "?" + suffix}
            aria-label="Xem ảnh khớp bộ lọc"
          >
            <PhotoImage photo={support} />
          </Link>
        </section>
      )}
      <header className="place-header">
        <div>
          <span className="eyebrow">{place.category.name}</span>
          <h1>{place.name}</h1>
          <p className="muted">
            <MapPin size={16} aria-hidden /> {place.address}
          </p>
          <div className="detail-actions">
            <SaveButton place={place} />
            {place.latitude !== null && place.longitude !== null && (
              <Button asChild variant="outline">
                <a
                  href={
                    "https://www.google.com/maps/dir/?api=1&destination=" +
                    place.latitude +
                    "," +
                    place.longitude
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Chỉ đường
                </a>
              </Button>
            )}
            <Button asChild>
              <Link to={"/submissions/new?place=" + place.id}>
                Đóng góp ảnh
              </Link>
            </Button>
          </div>
        </div>
        <Cover place={place} className="detail-cover" />
      </header>
      <section className="panel">
        <h2>Đặc điểm xuất hiện trong ảnh</h2>
        <p className="muted small">
          Các đặc điểm này xuất hiện trong ảnh, không phải ở mọi khu vực của
          quán.
        </p>
        <div className="attribute-chips">
          {place.attribute_evidence.map((e) => (
            <Link
              className="attribute-chip"
              key={e.attribute.code}
              to={"/photos/" + e.photo_ids[0]}
            >
              {e.attribute.display_name_vi}
            </Link>
          ))}
        </div>
        {!place.attribute_evidence.length && <p>Chưa có đặc điểm.</p>}
      </section>
      <section className="panel">
        <div className="page-heading">
          <h2>
            {params.get("attributes") ? "Ảnh theo bộ lọc" : "Ảnh cộng đồng"}
          </h2>
          {params.get("attributes") && (
            <Link to={"/places/" + place.id}>Xem tất cả ảnh</Link>
          )}
        </div>
        <Gallery
          key={id + suffix}
          placeId={id!}
          query={suffix}
          initial={place.photos}
        />
      </section>
      <section className="panel">
        <h2>Thông tin quán</h2>
        {place.description && <p>{place.description}</p>}
        <p>{place.address}</p>
        <p>
          {place.opening_hours
            ? "Giờ mở cửa: " + place.opening_hours.text
            : "Chưa có thông tin giờ mở cửa."}
        </p>
        {place.opening_hours && (
          <p className="muted small">
            Nguồn: {place.opening_hours.source} · Ngày kiểm tra:{" "}
            {date(place.opening_hours.verified_at)}
          </p>
        )}
        {place.latitude === null && (
          <p className="muted">Chưa có vị trí chính xác trên bản đồ.</p>
        )}
        <ReportButton kind="places" id={place.id} />
      </section>
    </>
  );
}
export function PhotoDetailPage() {
  const { id } = useParams(),
    [params] = useSearchParams(),
    location = useLocation(),
    me = useMe();
  const result = useQuery({
    queryKey: ["photo", id, params.get("attributes"), me.data?.id],
    queryFn: ({ signal }) =>
      api<PhotoDetail>("photos/" + id + "/?" + discoveryQuery(params), {
        signal,
      }),
  });
  if (!result.data)
    return (
      <State
        pending={result.isPending}
        error={result.error}
        onRetry={() => void result.refetch()}
      />
    );
  const photoNavigation = location.state as {
    from?: string;
    photoIds?: string[];
  } | null;
  const photoIds = photoNavigation?.photoIds || [];
  const photoIndex = photoIds.indexOf(id!);
  const photo = result.data,
    from =
      (location.state as { from?: string } | null)?.from ||
      "/places/" + photo.place_id;
  return (
    <>
      <Link className="back-link" to={from}>
        <ArrowLeft size={18} aria-hidden />
        Quay lại
      </Link>
      <section className="photo-viewer">
        <div className="viewer-stage">
          <PhotoImage key={photo.id} photo={photo} full />
          <span className="viewer-dimensions">
            {photo.width} × {photo.height} · Ảnh cộng đồng
          </span>
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
          <span className="eyebrow">Ảnh cộng đồng</span>
          <Link to={"/places/" + photo.place_id + location.search}>
            <h1>{photo.place.name}</h1>
          </Link>
          <p className="viewer-caption">
            {photo.caption || "Ảnh do cộng đồng đóng góp."}
          </p>
          <p className="viewer-address">
            <MapPin size={16} /> {photo.place.address}
          </p>
          <h2 className="viewer-section-title">Đặc điểm trong ảnh</h2>
          <AttributeChips
            attributes={photo.attributes}
            matched={photo.matched_attribute_codes}
          />
          {!photo.attributes.length && <p>Chưa có đặc điểm.</p>}
          <p className="muted small">
            Các đặc điểm chỉ mô tả ảnh này, không phải toàn bộ quán.
          </p>
          {photo.published_at && (
            <p className="muted small">Ngày đăng: {date(photo.published_at)}</p>
          )}
          <div className="detail-actions">
            <SaveButton place={photo.place} />
            <ReportButton kind="photos" id={photo.id} />
          </div>
        </div>
      </section>
    </>
  );
}
