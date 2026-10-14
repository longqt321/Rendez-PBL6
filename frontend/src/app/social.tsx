import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  MessageCircle,
  Share2,
  Trash2,
  Pencil,
  Check,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useState } from "react";
import { api, date, type Page } from "../lib/api/client";
import type { PublicPhoto } from "../lib/api/visual";
import { Button } from "../components/ui/button";
import { ErrorText, State } from "./shared";

type Comment = {
  id: number;
  body: string;
  author_name: string;
  is_owner: boolean;
  created_at: string;
};
type Credit = {
  author?: string;
  license?: string;
  license_url?: string;
  source_url?: string;
  taken_at?: string;
  changes?: string;
};

export function PhotoCredit({ photo }: { photo: PublicPhoto }) {
  const credit = photo.attribution as Credit;
  return (
    <div className="photo-credit">
      <span className="photo-author-avatar">
        {(credit.author || photo.author_name).slice(0, 1).toUpperCase()}
      </span>
      <div>
        <strong>{credit.author || photo.author_name}</strong>
        {credit.source_url ? (
          <p>
            <a
              href={credit.source_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ảnh tư liệu · Wikimedia Commons{" "}
              <ExternalLink size={12} aria-hidden />
            </a>
          </p>
        ) : (
          <p>Ảnh do người dùng đăng</p>
        )}
        {credit.license && (
          <p>
            <a
              href={credit.license_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {credit.license}
            </a>
            {credit.taken_at && ` · Chụp ${date(credit.taken_at)}`}
          </p>
        )}
        {credit.changes && <small>{credit.changes}</small>}
      </div>
    </div>
  );
}

export function ShareButton() {
  const [message, setMessage] = useState("");
  return (
    <div className="share-control">
      <Button
        variant="outline"
        onClick={async () => {
          try {
            const url = window.location.href;
            if (navigator.share)
              await navigator.share({ title: document.title, url });
            else {
              await navigator.clipboard.writeText(url);
              setMessage("Đã sao chép liên kết");
            }
          } catch (error) {
            if (!(error instanceof DOMException && error.name === "AbortError"))
              setMessage(
                "Không sao chép được. Bạn có thể sao chép địa chỉ trên trình duyệt.",
              );
          }
        }}
      >
        <Share2 size={17} aria-hidden />
        Chia sẻ
      </Button>
      <span role="status" className="small">
        {message}
      </span>
    </div>
  );
}

export function OwnPhotoControls({ photo }: { photo: PublicPhoto }) {
  const navigate = useNavigate(),
    cache = useQueryClient(),
    [editing, setEditing] = useState(false),
    [caption, setCaption] = useState(photo.caption);
  const mutation = useMutation({
    mutationFn: (remove: boolean) =>
      api("photos/" + photo.id + "/manage/", {
        method: remove ? "DELETE" : "PATCH",
        body: remove ? undefined : JSON.stringify({ caption }),
      }),
    onSuccess: async (_, remove) => {
      setEditing(false);
      if (remove) navigate("/submissions", { replace: true });
      await cache.invalidateQueries();
    },
  });
  if (!photo.is_owner) return null;
  return (
    <div className="owner-controls">
      <div className="detail-actions">
        <Button variant="outline" onClick={() => setEditing(!editing)}>
          <Pencil size={16} aria-hidden />
          Sửa mô tả
        </Button>
        <Button
          variant="outline"
          className="danger-button"
          disabled={mutation.isPending}
          onClick={() => {
            if (
              window.confirm(
                "Gỡ ảnh này? Ảnh sẽ không còn xuất hiện công khai.",
              )
            )
              mutation.mutate(true);
          }}
        >
          <Trash2 size={16} aria-hidden />
          Gỡ ảnh
        </Button>
      </div>
      {editing && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate(false);
          }}
        >
          <label htmlFor={"caption-" + photo.id}>Mô tả ảnh</label>
          <textarea
            id={"caption-" + photo.id}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={1000}
          />
          <Button disabled={mutation.isPending}>
            <Check size={16} aria-hidden />
            Lưu mô tả
          </Button>
        </form>
      )}
      <ErrorText error={mutation.error} />
    </div>
  );
}

export function Comments({ photoId }: { photoId: string }) {
  const cache = useQueryClient(),
    [body, setBody] = useState("");
  const key = ["comments", photoId];
  const comments = useInfiniteQuery({
    queryKey: key,
    initialPageParam: "1",
    queryFn: ({ pageParam, signal }) =>
      api<Page<Comment>>("photos/" + photoId + "/comments/?page=" + pageParam, {
        signal,
      }),
    getNextPageParam: (last) =>
      last.next
        ? new URL(last.next, window.location.origin).searchParams.get("page") ||
          undefined
        : undefined,
  });
  const create = useMutation({
    mutationFn: () =>
      api("photos/" + photoId + "/comments/", {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: async () => {
      setBody("");
      await cache.invalidateQueries({ queryKey: key });
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) =>
      api("comments/" + id + "/", { method: "DELETE" }),
    onSuccess: () => cache.invalidateQueries({ queryKey: key }),
  });
  return (
    <section className="comments-section">
      <h2>
        <MessageCircle size={20} aria-hidden />
        Bình luận{comments.data && <span>{comments.data.pages[0].count}</span>}
      </h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <label className="sr-only" htmlFor="comment-body">
          Bình luận của bạn
        </label>
        <textarea
          id="comment-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={1000}
          placeholder="Hỏi về địa điểm hoặc chia sẻ trải nghiệm của bạn"
          required
        />
        <div className="comment-submit">
          <small>{body.length}/1000</small>
          <Button disabled={!body.trim() || create.isPending}>
            {create.isPending ? "Đang gửi…" : "Gửi bình luận"}
          </Button>
        </div>
        <ErrorText error={create.error} />
      </form>
      <State
        pending={comments.isPending}
        error={comments.error}
        onRetry={() => void comments.refetch()}
      />
      {comments.data?.pages[0].count === 0 && (
        <p className="muted small">Chưa có bình luận.</p>
      )}
      {comments.data?.pages
        .flatMap((page) => page.results)
        .map((comment) => (
          <article className="comment" key={comment.id}>
            <div>
              <strong>{comment.author_name}</strong>
              <small>{date(comment.created_at)}</small>
            </div>
            <p>{comment.body}</p>
            {comment.is_owner && (
              <button
                className="text-button danger-button"
                aria-label="Xóa bình luận của bạn"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm("Xóa bình luận này?"))
                    remove.mutate(comment.id);
                }}
              >
                Xóa
              </button>
            )}
          </article>
        ))}
      <ErrorText error={remove.error} />
      {comments.hasNextPage && (
        <Button
          variant="outline"
          disabled={comments.isFetchingNextPage}
          onClick={() => void comments.fetchNextPage()}
        >
          Xem thêm bình luận
        </Button>
      )}
    </section>
  );
}
