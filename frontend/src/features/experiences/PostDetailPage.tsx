import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Bookmark,
  Heart,
  MapPin,
  MessageCircle,
  Share2,
} from "lucide-react";
import { clsx } from "clsx";
import {
  useAddPostComment,
  usePost,
  usePostComments,
  usePostLike,
  usePostSave,
  usePostShare,
  usePostView,
} from "../../lib/api/queries";
import { useMe } from "../../lib/session";
import { formatRelative } from "../../lib/format";
import { AsyncState, EmptyState } from "../../components/ui/states";
import { Button } from "../../components/ui/button";
import { Avatar } from "../../components/ui/primitives";
import { SafeImage } from "../../components/ui/safe-image";
import { ErrorText } from "../../app/shared";

/**
 * Experience (post) detail.
 *
 * A post is a contributor's account of a place: one or more photos, a caption,
 * and the place it belongs to. The place link is the most important outbound
 * action, because that is where the durable information lives.
 */
export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const me = useMe();

  const post = usePost(id, me.data?.id);
  const comments = usePostComments(id);
  const like = usePostLike(id ?? "");
  const save = usePostSave(id ?? "");
  const share = usePostShare(id ?? "");
  const view = usePostView(id ?? "");
  const addComment = useAddPostComment(id ?? "");

  const [mediaIndex, setMediaIndex] = useState(0);
  const [body, setBody] = useState("");
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  // Count a view once the post is actually on screen, and only once.
  const viewed = useRef(false);
  useEffect(() => {
    if (post.data && !viewed.current) {
      viewed.current = true;
      view.mutate();
    }
  }, [post.data, view]);

  const backTo = (location.state as { from?: string } | null)?.from ?? "/posts";

  if (!post.data) {
    return (
      <AsyncState
        pending={post.isPending}
        error={post.error}
        onRetry={() => void post.refetch()}
        returnTo={location.pathname}
      />
    );
  }

  const data = post.data;
  const media = data.media.filter(
    (item) => item.status === "published" || !item.status,
  );
  const current = media[Math.min(mediaIndex, media.length - 1)];

  if (!current) {
    return (
      <div className="post-detail">
        <Link className="back-link" to={backTo}>
          <ArrowLeft size={16} aria-hidden />
          Quay lại
        </Link>
        <EmptyState
          title="Trải nghiệm này không có nội dung công khai"
          body="Ảnh có thể đã bị gỡ hoặc đang chờ duyệt."
          actions={
            <Button asChild variant="outline">
              <Link to="/posts">Xem trải nghiệm khác</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const requireLogin = (action: () => void) => {
    if (!me.data) {
      navigate("/login", {
        state: { returnTo: location.pathname + location.search },
      });
      return;
    }
    action();
  };

  const doShare = async () => {
    const url = window.location.origin + "/posts/" + data.id;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Rendez",
          text: data.caption || data.place_name,
          url,
        });
        setShareNotice("Đã chia sẻ");
      } else {
        await navigator.clipboard.writeText(url);
        setShareNotice("Đã sao chép liên kết");
      }
      share.mutate();
    } catch {
      return;
    }
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setShareNotice(null), 2500);
  };

  return (
    <article className="post-detail">
      <Link className="back-link" to={backTo}>
        <ArrowLeft size={16} aria-hidden />
        Quay lại
      </Link>

      <div className="post-detail__layout">
        <div className="post-detail__media">
          <SafeImage
            sources={[current.media_url]}
            alt={current.alt_text || data.caption || data.place_name}
            ratio="4 / 3"
            eager
          />
          {media.length > 1 && (
            <div
              className="post-detail__thumbs"
              role="group"
              aria-label="Ảnh trong trải nghiệm"
            >
              {media.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className="post-detail__thumb"
                  aria-label={
                    "Xem ảnh " + (index + 1) + " trên " + media.length
                  }
                  aria-pressed={index === mediaIndex}
                  onClick={() => setMediaIndex(index)}
                >
                  <SafeImage
                    sources={[item.media_url]}
                    alt={item.alt_text || ""}
                    ratio="1 / 1"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="post-detail__side">
          <header className="post-detail__head">
            <div className="post-detail__author">
              <Avatar name={data.author_name} />
              <div>
                <p className="post-detail__author-name">{data.author_name}</p>
                <p className="post-detail__time">
                  {formatRelative(data.published_at)}
                </p>
              </div>
            </div>
            {data.place && data.place_name && (
              <Link className="post-detail__place" to={"/places/" + data.place}>
                <MapPin size={14} aria-hidden />
                {data.place_name}
              </Link>
            )}
          </header>

          {data.caption && (
            <p className="post-detail__caption">{data.caption}</p>
          )}

          {data.origin === "seed" && (
            <p className="post-detail__origin">
              Ảnh tư liệu minh họa do Rendez cung cấp
            </p>
          )}

          <div className="post-detail__actions">
            <button
              type="button"
              className={clsx("action-button", data.liked && "is-active")}
              aria-pressed={data.liked ?? false}
              aria-label={
                data.liked ? "Bỏ thích trải nghiệm" : "Thích trải nghiệm"
              }
              disabled={like.isPending}
              onClick={() =>
                requireLogin(() => like.mutate(data.liked ?? false))
              }
            >
              <Heart
                size={18}
                fill={data.liked ? "currentColor" : "none"}
                aria-hidden
              />
              <span className="tabular">{data.like_count}</span>
            </button>

            <button
              type="button"
              className={clsx("action-button", data.saved && "is-active")}
              aria-pressed={data.saved ?? false}
              aria-label={data.saved ? "Bỏ lưu trải nghiệm" : "Lưu trải nghiệm"}
              disabled={save.isPending}
              onClick={() =>
                requireLogin(() => save.mutate(data.saved ?? false))
              }
            >
              <Bookmark
                size={18}
                fill={data.saved ? "currentColor" : "none"}
                aria-hidden
              />
              <span>{data.saved ? "Đã lưu" : "Lưu"}</span>
            </button>

            <button
              type="button"
              className="action-button"
              aria-label="Chia sẻ trải nghiệm"
              onClick={() => void doShare()}
            >
              <Share2 size={18} aria-hidden />
              <span>Chia sẻ</span>
            </button>
          </div>

          {shareNotice && (
            <p className="share-control__toast" role="status">
              {shareNotice}
            </p>
          )}

          <ErrorText error={like.error || save.error || share.error} />

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
                Chưa có bình luận. Hãy mở đầu cuộc trò chuyện.
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
                const value = body.trim();
                if (!value) return;
                requireLogin(() =>
                  addComment.mutate(value, { onSuccess: () => setBody("") }),
                );
              }}
            >
              <label className="sr-only" htmlFor="post-comment">
                Nội dung bình luận
              </label>
              <textarea
                id="post-comment"
                className="textarea"
                placeholder="Viết bình luận…"
                maxLength={1000}
                value={body}
                onChange={(event) => setBody(event.currentTarget.value)}
              />
              <div className="comment-form__foot">
                <span className="muted micro tabular">
                  {1000 - body.length} ký tự còn lại
                </span>
                <Button
                  type="submit"
                  size="sm"
                  disabled={addComment.isPending || !body.trim()}
                >
                  {addComment.isPending ? "Đang gửi…" : "Gửi"}
                </Button>
              </div>
              <ErrorText error={addComment.error} />
            </form>
          </section>

          {data.place && (
            <Button asChild variant="outline" block>
              <Link to={"/places/" + data.place}>
                <MapPin size={16} aria-hidden />
                Xem địa điểm {data.place_name}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
