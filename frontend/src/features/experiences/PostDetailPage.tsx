import { useActionState, useEffect, useRef, useState } from "react";
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
import { ErrorText } from "../../components/ui/error-text";

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
  const [, commentAction, isSubmittingComment] = useActionState(async () => {
    const value = body.trim();
    if (!value) return;
    requireLogin(async () => {
      await addComment.mutateAsync(value);
      setBody("");
    });
  }, null);
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
              <Link to="/posts">Xem ảnh khác</Link>
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
    <article className="post-detail max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      <Link className="back-link inline-flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100" to={backTo}>
        <ArrowLeft size={16} aria-hidden />
        Quay lại
      </Link>

      <div className="post-detail__layout grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="post-detail__media flex flex-col gap-3">
          <div className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <SafeImage
              sources={[current.media_url]}
              alt={current.alt_text || data.caption || data.place_name}
              ratio="4 / 3"
              eager
            />
          </div>
          {media.length > 1 && (
            <div
              className="post-detail__thumbs flex items-center gap-2 overflow-x-auto pb-1"
              role="group"
              aria-label="Ảnh trong bài"
            >
              {media.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={`post-detail__thumb w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    index === mediaIndex
                      ? "border-blue-600 shadow-xs"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
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

        <div className="post-detail__side flex flex-col gap-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
          <header className="post-detail__head flex items-start justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-4">
            <div className="post-detail__author flex items-center gap-3">
              <Avatar name={data.author_name} />
              <div>
                <p className="post-detail__author-name font-semibold text-neutral-900 dark:text-neutral-100 text-sm">{data.author_name}</p>
                <p className="post-detail__time text-xs text-neutral-400">
                  {formatRelative(data.published_at)}
                </p>
              </div>
            </div>
            {data.place && data.place_name && (
              <Link className="post-detail__place inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline" to={"/places/" + data.place}>
                <MapPin size={14} aria-hidden />
                {data.place_name}
              </Link>
            )}
          </header>

          {data.caption && (
            <p className="post-detail__caption text-sm text-neutral-700 dark:text-neutral-300">{data.caption}</p>
          )}

          {data.origin === "seed" && (
            <p className="post-detail__origin text-xs text-neutral-400 italic">
              Ảnh tư liệu minh họa do Rendez cung cấp
            </p>
          )}

          <div className="post-detail__actions flex items-center gap-3">
            <button
              type="button"
              className={clsx(
                "action-button inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer",
                data.liked
                  ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900"
                  : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              )}
              aria-pressed={data.liked ?? false}
              aria-label={data.liked ? "Bỏ thích ảnh" : "Thích ảnh"}
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
              className={clsx(
                "action-button inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer",
                data.saved
                  ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900"
                  : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              )}
              aria-pressed={data.saved ?? false}
              aria-label={data.saved ? "Bỏ lưu ảnh" : "Lưu ảnh"}
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
              className="action-button inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 cursor-pointer transition-colors"
              aria-label="Chia sẻ ảnh"
              onClick={() => void doShare()}
            >
              <Share2 size={18} aria-hidden />
              <span>Chia sẻ</span>
            </button>
          </div>

          {shareNotice && (
            <p className="share-control__toast text-xs text-blue-600 font-medium" role="status">
              {shareNotice}
            </p>
          )}

          <ErrorText error={like.error || save.error || share.error} />

          <section className="comment-panel flex flex-col gap-4 border-t border-neutral-100 dark:border-neutral-800 pt-4" aria-label="Bình luận">
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
                Chưa có bình luận. Hãy mở đầu cuộc trò chuyện.
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
              action={commentAction}
            >
              <label className="sr-only" htmlFor="post-comment">
                Nội dung bình luận
              </label>
              <textarea
                id="post-comment"
                name="comment"
                className="textarea w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 outline-none transition-all resize-y min-h-[80px]"
                placeholder="Viết bình luận…"
                maxLength={1000}
                value={body}
                onChange={(event) => setBody(event.currentTarget.value)}
              />
              <div className="comment-form__foot flex items-center justify-between">
                <span className="muted micro tabular text-[11px] text-neutral-400">
                  {1000 - body.length} ký tự còn lại
                </span>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingComment || addComment.isPending || !body.trim()}
                >
                  {isSubmittingComment || addComment.isPending ? "Đang gửi…" : "Gửi"}
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
