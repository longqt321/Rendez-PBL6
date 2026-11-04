import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Heart,
  MapPin,
  MessageCircle,
  Share2,
  Trash2,
} from "lucide-react";
import { clsx } from "clsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api/client";
import {
  queryKeys,
  useAddPhotoComment,
  usePhoto,
  useSimilarPhotos,
  useTogglePhotoLike,
} from "../../lib/api/queries";
import type { PhotoLikes } from "../../lib/api/types";
import { useMe } from "../../lib/session";
import { formatRelative, shortAddress } from "../../lib/format";
import { AsyncState, EmptyState } from "../../components/ui/states";
import { Button } from "../../components/ui/button";
import { Avatar } from "../../components/ui/primitives";
import { SafeImage } from "../../components/ui/safe-image";
import { SavePlaceButton } from "../places/PlaceCard";
import { ExperienceTile } from "../experiences/ExperienceCard";
import { ReportDialog } from "../moderation/ReportDialog";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { ErrorText } from "../../components/ui/error-text";

/**
 * Experience (photo) detail.
 *
 * The photo is the subject; the place is its context. Actions are the real
 * ones the API exposes — like, save the place, share, comment, report, and
 * owner-only manage. Nothing here is decorative.
 */
export function PhotoDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const me = useMe();
  const photo = usePhoto(id, me.data?.id);

  const backTo =
    (location.state as { from?: string } | null)?.from ?? "/discover";

  if (!photo.data) {
    return (
      <AsyncState
        pending={photo.isPending}
        error={photo.error}
        onRetry={() => void photo.refetch()}
        returnTo={location.pathname}
      />
    );
  }

  const data = photo.data;
  const place = data.place;

  return (
    <article className="experience-detail max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      <Link className="back-link inline-flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100" to={backTo}>
        <ArrowLeft size={16} aria-hidden />
        Quay lại
      </Link>

      <div className="experience-detail__layout grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <figure className="experience-detail__figure rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <SafeImage
            sources={[data.url]}
            alt={data.alt_text || data.caption || "Ảnh địa điểm"}
            ratio={
              data.width && data.height
                ? `${data.width} / ${data.height}`
                : "3 / 4"
            }
            eager
          />
          {data.caption && (
            <figcaption className="experience-detail__caption p-4 text-sm text-neutral-700 dark:text-neutral-300 border-t border-neutral-100 dark:border-neutral-800">
              {data.caption}
            </figcaption>
          )}
        </figure>

        <div className="experience-detail__side flex flex-col gap-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
          <header className="experience-detail__head flex flex-col gap-1 border-b border-neutral-100 dark:border-neutral-800 pb-4">
            <Link
              className="experience-detail__place text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              to={"/places/" + place.id}
            >
              {place.name}
            </Link>
            <p className="experience-detail__address flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <MapPin size={13} aria-hidden />
              {shortAddress(place.address)}
            </p>
          </header>

          <div className="experience-detail__author flex items-center gap-3">
            <Avatar name={data.author_name} />
            <div>
              <p className="experience-detail__author-name text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {data.author_name}
              </p>
              <p className="experience-detail__time text-xs text-neutral-400">
                {formatRelative(data.published_at)}
              </p>
            </div>
          </div>

          {data.attributes.length > 0 && (
            <ul className="experience-detail__tags flex flex-wrap gap-1.5" role="list">
              {data.attributes.map((attribute) => (
                <li key={attribute.code} className="chip px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  {attribute.display_name_vi}
                </li>
              ))}
            </ul>
          )}

          <div className="experience-detail__actions flex items-center gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <LikeControl photoId={data.id} />
            <ShareControl photoId={data.id} caption={data.caption} />
            <SavePlaceButton place={place} />
          </div>

          <CommentSection photoId={data.id} />

          <footer className="experience-detail__foot flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <ReportDialog kind="photos" id={data.id} />
            {data.is_owner && (
              <OwnerControls
                photoId={data.id}
                caption={data.caption}
                onDeleted={() => navigate("/discover", { replace: true })}
              />
            )}
          </footer>
        </div>
      </div>

      <RelatedExperiences photoId={data.id} placeId={place.id} />
    </article>
  );
}

/* ------------------------------------------------------------------- Like */

function LikeControl({ photoId }: { photoId: string }) {
  const me = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const likes = useQuery({
    queryKey: queryKeys.photoLikes(photoId),
    queryFn: ({ signal }) =>
      api<PhotoLikes>("photos/" + photoId + "/likes/", { signal }),
  });
  const mutation = useTogglePhotoLike(photoId);
  const [, startTransition] = useTransition();

  const serverLiked = likes.data?.liked ?? false;
  const serverCount = likes.data?.count ?? 0;

  const [optimisticState, setOptimisticState] = useOptimistic(
    { liked: serverLiked, count: serverCount },
    (state, update: boolean) => ({
      liked: update,
      count: update ? state.count + 1 : Math.max(0, state.count - 1),
    }),
  );

  const liked = optimisticState.liked;
  const count = optimisticState.count;

  return (
    <button
      type="button"
      className={clsx(
        "action-button inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer",
        liked
          ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900"
          : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
      )}
      aria-label={liked ? "Bỏ thích ảnh" : "Thích ảnh"}
      aria-pressed={liked}
      disabled={mutation.isPending}
      onClick={() => {
        if (!me.data) {
          navigate("/login", {
            state: { returnTo: location.pathname + location.search },
          });
          return;
        }
        const nextLiked = !liked;
        startTransition(async () => {
          setOptimisticState(nextLiked);
          await mutation.mutateAsync(liked);
        });
      }}
    >
      <Heart size={18} fill={liked ? "currentColor" : "none"} aria-hidden />
      <span className="tabular">{count}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ Share */

function ShareControl({
  photoId,
  caption,
}: {
  photoId: string;
  caption: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const share = async () => {
    const url = window.location.origin + "/photos/" + photoId;
    const payload = {
      title: "Rendez",
      text: caption || "Một địa điểm trên Rendez",
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        setMessage("Đã chia sẻ");
      } else {
        await navigator.clipboard.writeText(url);
        setMessage("Đã sao chép liên kết");
      }
    } catch {
      // A dismissed share sheet is not an error worth reporting.
      return;
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(null), 2500);
  };

  return (
    <div className="share-control relative">
      <button
        type="button"
        className="action-button inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 cursor-pointer transition-colors"
        aria-label="Chia sẻ ảnh"
        onClick={() => void share()}
      >
        <Share2 size={18} aria-hidden />
        <span>Chia sẻ</span>
      </button>
      {message && (
        <span className="share-control__toast absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-md bg-neutral-900 text-white text-xs whitespace-nowrap shadow-md" role="status">
          {message}
        </span>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Comments */

function CommentSection({ photoId }: { photoId: string }) {
  const me = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const comments = useQuery({
    queryKey: queryKeys.photoComments(photoId),
    queryFn: ({ signal }) =>
      api<Comment[]>("photos/" + photoId + "/comments/", { signal }),
  });
  const add = useAddPhotoComment(photoId);
  const [body, setBody] = useState("");
  const remaining = 1000 - body.length;

  const [, formAction, isSubmitting] = useActionState(async () => {
    if (!me.data) {
      navigate("/login", {
        state: { returnTo: location.pathname + location.search },
      });
      return;
    }
    const value = body.trim();
    if (!value) return;
    await add.mutateAsync(value);
    setBody("");
  }, null);

  return (
    <section className="comment-panel flex flex-col gap-4" aria-label="Bình luận">
      <h2 className="comment-panel__title text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
        <MessageCircle size={16} aria-hidden />
        Bình luận
        {comments.data ? (
          <span className="muted tabular text-neutral-400 font-normal">({comments.data.length})</span>
        ) : null}
      </h2>

      <AsyncState
        pending={comments.isPending}
        error={comments.error}
        onRetry={() => void comments.refetch()}
        loadingVariant="inline"
      />

      {comments.data && comments.data.length === 0 && (
        <p className="muted small text-xs text-neutral-500">
          Chưa có bình luận. Chia sẻ cảm nhận của bạn về địa điểm này.
        </p>
      )}

      {comments.data && comments.data.length > 0 && (
        <ul className="comment-list flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800" role="list">
          {comments.data.map((comment) => (
            <li className="comment flex items-start gap-3 py-3" key={comment.id}>
              <Avatar name={comment.author_name} size="sm" />
              <div className="comment__body flex-1 min-w-0">
                <p className="comment__meta flex items-center gap-2 text-xs">
                  <strong className="font-semibold text-neutral-900 dark:text-neutral-100">{comment.author_name}</strong>
                  <span className="text-neutral-400">{formatRelative(comment.created_at)}</span>
                </p>
                <p className="comment__text text-sm text-neutral-700 dark:text-neutral-300 mt-1">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        className="comment-form flex flex-col gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800"
        action={formAction}
      >
        <label className="sr-only" htmlFor="photo-comment">
          Viết bình luận
        </label>
        <textarea
          id="photo-comment"
          name="comment"
          className="textarea w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 outline-none transition-all resize-y min-h-[80px]"
          placeholder="Chia sẻ cảm nhận hoặc câu chuyện của bạn về bức ảnh này…"
          maxLength={1000}
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
        />
        <div className="comment-form__foot flex items-center justify-between">
          <span className="muted micro tabular text-[11px] text-neutral-400">{remaining} ký tự còn lại</span>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || add.isPending || !body.trim()}
          >
            {isSubmitting || add.isPending ? "Đang gửi…" : "Gửi"}
          </Button>
        </div>
        <ErrorText error={add.error} />
      </form>
    </section>
  );
}

/* ---------------------------------------------------------- Owner controls */

function OwnerControls({
  photoId,
  caption,
  onDeleted,
}: {
  photoId: string;
  caption: string;
  onDeleted: () => void;
}) {
  const cache = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(caption);

  const remove = async () => {
    setPending(true);
    setError(null);
    try {
      await api("photos/" + photoId + "/manage/", { method: "DELETE" });
      await cache.invalidateQueries();
      onDeleted();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught : new Error("Không xóa được ảnh."),
      );
      setPending(false);
    }
  };

  const saveCaption = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api("photos/" + photoId + "/manage/", {
        method: "PATCH",
        body: JSON.stringify({ caption: draft.trim() }),
      });
      await cache.invalidateQueries({ queryKey: ["photo", photoId] });
      setEditing(false);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught : new Error("Không lưu được."),
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="owner-controls flex flex-col gap-2">
      {editing ? (
        <form onSubmit={saveCaption} className="owner-controls__edit flex flex-col gap-2">
          <label className="sr-only" htmlFor="owner-caption">
            Chú thích ảnh
          </label>
          <textarea
            id="owner-caption"
            className="textarea w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 outline-none"
            maxLength={1000}
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
          />
          <div className="cluster flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              Lưu
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(caption);
                setEditing(false);
              }}
            >
              Hủy
            </Button>
          </div>
        </form>
      ) : (
        <div className="cluster flex items-center gap-3 text-xs">
          <button
            type="button"
            className="inline-link inline-link--muted text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 cursor-pointer"
            onClick={() => setEditing(true)}
          >
            Sửa chú thích
          </button>
          <button
            type="button"
            className="inline-link inline-link--muted flex items-center gap-1 text-red-500 hover:text-red-700 cursor-pointer"
            onClick={() => setConfirming(true)}
          >
            <Trash2 size={14} aria-hidden />
            Xóa ảnh
          </button>
        </div>
      )}

      <ErrorText error={error} />

      <ConfirmDialog
        open={confirming}
        title="Xóa ảnh này?"
        description="Ảnh sẽ bị gỡ khỏi hồ sơ công khai. Hành động này không thể hoàn tác."
        confirmLabel="Xóa ảnh"
        isDestructive
        isLoading={pending}
        onConfirm={() => void remove()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

/* --------------------------------------------------------------- Related */

function RelatedExperiences({
  photoId,
  placeId,
}: {
  photoId: string;
  placeId: string;
}) {
  const me = useMe();
  const similar = useSimilarPhotos(photoId, me.data?.id);

  if (!similar.data || similar.data.length === 0) {
    return null;
  }

  const related = similar.data
    .filter((item) => item.photo.id !== photoId)
    .slice(0, 6);

  if (related.length === 0) {
    return (
      <EmptyState
        compact
        title="Chưa có ảnh tương tự"
        body="Khi cộng đồng chia sẻ thêm ảnh ở khu vực này, chúng sẽ xuất hiện tại đây."
      />
    );
  }

  return (
    <section
      className="experience-detail__related flex flex-col gap-4 mt-8 pt-8 border-t border-neutral-200 dark:border-neutral-800"
      aria-labelledby="related-heading"
    >
      <div className="section-head flex items-center justify-between">
        <div>
          <h2 id="related-heading" className="editorial section-head__title text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Ảnh cùng khu vực
          </h2>
        </div>
        <Link className="section-head__link text-sm font-medium text-blue-600 hover:underline" to={"/places/" + placeId}>
          Xem địa điểm
        </Link>
      </div>
      <ul className="related-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3" role="list">
        {related.map((item) => (
          <li key={item.photo.id} className="flex flex-col gap-1.5">
            <ExperienceTile item={item} />
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

interface Comment {
  id: number;
  author_name: string;
  body: string;
  created_at: string;
}
