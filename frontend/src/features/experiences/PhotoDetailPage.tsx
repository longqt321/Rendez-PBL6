import { useEffect, useRef, useState } from "react";
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
import { ErrorText } from "../../app/shared";

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
    <article className="experience-detail">
      <Link className="back-link" to={backTo}>
        <ArrowLeft size={16} aria-hidden />
        Quay lại
      </Link>

      <div className="experience-detail__layout">
        <figure className="experience-detail__figure">
          <SafeImage
            sources={[data.url]}
            alt={data.alt_text || data.caption || "Ảnh trải nghiệm"}
            ratio={
              data.width && data.height
                ? `${data.width} / ${data.height}`
                : "3 / 4"
            }
            eager
          />
          {data.caption && (
            <figcaption className="experience-detail__caption">
              {data.caption}
            </figcaption>
          )}
        </figure>

        <div className="experience-detail__side">
          <header className="experience-detail__head">
            <Link
              className="experience-detail__place"
              to={"/places/" + place.id}
            >
              {place.name}
            </Link>
            <p className="experience-detail__address">
              <MapPin size={13} aria-hidden />
              {shortAddress(place.address)}
            </p>
          </header>

          <div className="experience-detail__author">
            <Avatar name={data.author_name} />
            <div>
              <p className="experience-detail__author-name">
                {data.author_name}
              </p>
              <p className="experience-detail__time">
                {formatRelative(data.published_at)}
              </p>
            </div>
          </div>

          {data.attributes.length > 0 && (
            <ul className="experience-detail__tags" role="list">
              {data.attributes.map((attribute) => (
                <li key={attribute.code} className="chip">
                  {attribute.display_name_vi}
                </li>
              ))}
            </ul>
          )}

          <div className="experience-detail__actions">
            <LikeControl photoId={data.id} />
            <ShareControl photoId={data.id} caption={data.caption} />
            <SavePlaceButton place={place} />
          </div>

          <CommentSection photoId={data.id} />

          <footer className="experience-detail__foot">
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

  const liked = likes.data?.liked ?? false;
  const count = likes.data?.count ?? 0;

  return (
    <button
      type="button"
      className={clsx("action-button", liked && "is-active")}
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
        mutation.mutate(liked);
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
    <div className="share-control">
      <button
        type="button"
        className="action-button"
        aria-label="Chia sẻ ảnh"
        onClick={() => void share()}
      >
        <Share2 size={18} aria-hidden />
        <span>Chia sẻ</span>
      </button>
      {message && (
        <span className="share-control__toast" role="status">
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

  return (
    <section className="comment-panel" aria-label="Bình luận">
      <h2 className="comment-panel__title">
        <MessageCircle size={16} aria-hidden />
        Bình luận
        {comments.data ? (
          <span className="muted tabular">({comments.data.length})</span>
        ) : null}
      </h2>

      <AsyncState
        pending={comments.isPending}
        error={comments.error}
        onRetry={() => void comments.refetch()}
        loadingVariant="inline"
      />

      {comments.data && comments.data.length === 0 && (
        <p className="muted small">
          Chưa có bình luận. Chia sẻ cảm nhận của bạn về địa điểm này.
        </p>
      )}

      {comments.data && comments.data.length > 0 && (
        <ul className="comment-list" role="list">
          {comments.data.map((comment) => (
            <li className="comment" key={comment.id}>
              <Avatar name={comment.author_name} size="sm" />
              <div className="comment__body">
                <p className="comment__meta">
                  <strong>{comment.author_name}</strong>
                  <span>{formatRelative(comment.created_at)}</span>
                </p>
                <p className="comment__text">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        className="comment-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!me.data) {
            navigate("/login", {
              state: { returnTo: location.pathname + location.search },
            });
            return;
          }
          const value = body.trim();
          if (!value) return;
          add.mutate(value, { onSuccess: () => setBody("") });
        }}
      >
        <label className="sr-only" htmlFor="photo-comment">
          Viết bình luận
        </label>
        <textarea
          id="photo-comment"
          className="textarea"
          placeholder="Chia sẻ cảm nhận hoặc câu chuyện của bạn về bức ảnh này…"
          maxLength={1000}
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
        />
        <div className="comment-form__foot">
          <span className="muted micro tabular">{remaining} ký tự còn lại</span>
          <Button
            type="submit"
            size="sm"
            disabled={add.isPending || !body.trim()}
          >
            {add.isPending ? "Đang gửi…" : "Gửi"}
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
    <div className="owner-controls">
      {editing ? (
        <form onSubmit={saveCaption} className="owner-controls__edit">
          <label className="sr-only" htmlFor="owner-caption">
            Chú thích ảnh
          </label>
          <textarea
            id="owner-caption"
            className="textarea"
            maxLength={1000}
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
          />
          <div className="cluster">
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
        <div className="cluster">
          <button
            type="button"
            className="inline-link inline-link--muted"
            onClick={() => setEditing(true)}
          >
            Sửa chú thích
          </button>
          <button
            type="button"
            className="inline-link inline-link--muted"
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
        title="Chưa có trải nghiệm tương tự"
        body="Khi cộng đồng chia sẻ thêm ảnh ở khu vực này, chúng sẽ xuất hiện tại đây."
      />
    );
  }

  return (
    <section
      className="experience-detail__related"
      aria-labelledby="related-heading"
    >
      <div className="section-head">
        <div>
          <p className="eyebrow">Cùng khu vực</p>
          <h2 id="related-heading" className="editorial section-head__title">
            Trải nghiệm tương tự
          </h2>
        </div>
        <Link className="section-head__link" to={"/places/" + placeId}>
          Xem địa điểm
        </Link>
      </div>
      <ul className="related-grid" role="list">
        {related.map((item) => (
          <li key={item.photo.id}>
            <ExperienceTile item={item} />
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

interface Comment {
  id: number;
  author_name: string;
  body: string;
  created_at: string;
}
