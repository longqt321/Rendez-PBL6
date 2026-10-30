import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  Share2,
  Trash2,
  Pencil,
  Check,
  MessageSquare,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { useState } from "react";
import { api, date } from "../lib/api/client";
import type { PhotoComment, PublicPhoto } from "../lib/api/visual";
import { Button } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { ErrorText, useMe } from "./shared";

export function PhotoCredit({ photo }: { photo: PublicPhoto }) {
  const content = (
    <>
      <span className="photo-author-avatar" aria-hidden>
        {photo.author_name.slice(0, 1).toUpperCase()}
      </span>
      <div>
        <strong>{photo.author_name}</strong>
        {photo.published_at && (
          <p>
            Đăng ngày{" "}
            <time dateTime={photo.published_at}>
              {date(photo.published_at)}
            </time>
          </p>
        )}
      </div>
    </>
  );

  if (photo.author_id) {
    return (
      <Link
        to={"/creators/" + photo.author_id}
        className="photo-credit photo-credit-link"
        aria-label={"Trang người chụp " + photo.author_name}
      >
        {content}
      </Link>
    );
  }

  return <div className="photo-credit">{content}</div>;
}

export function ShareButton({ compact = false }: { compact?: boolean }) {
  const [message, setMessage] = useState("");
  return (
    <div className="share-control">
      <Button
        variant="outline"
        aria-label="Chia sẻ"
        title="Chia sẻ"
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
        {!compact && "Chia sẻ"}
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
    [confirmDelete, setConfirmDelete] = useState(false),
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
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 size={16} aria-hidden />
          Gỡ ảnh
        </Button>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Gỡ ảnh này?"
        description="Ảnh này sẽ không còn xuất hiện trên trang địa điểm và bảng tin công khai."
        confirmLabel="Gỡ ảnh"
        isDestructive
        isLoading={mutation.isPending}
        onConfirm={() => {
          mutation.mutate(true, {
            onSettled: () => setConfirmDelete(false),
          });
        }}
        onCancel={() => setConfirmDelete(false)}
      />
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
            {mutation.isPending ? "Đang lưu…" : "Lưu mô tả"}
          </Button>
        </form>
      )}
      <ErrorText error={mutation.error} />
    </div>
  );
}

type Likes = { liked: boolean; count: number };

export function LikeButton({ photoId }: { photoId: string }) {
  const me = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const cache = useQueryClient();
  const queryKey = ["photo-likes", photoId];
  const endpoint = "photos/" + photoId + "/likes/";
  const likes = useQuery({ queryKey, queryFn: () => api<Likes>(endpoint) });
  const mutation = useMutation({
    mutationFn: () =>
      api<Likes>(endpoint, { method: likes.data?.liked ? "DELETE" : "POST" }),
    onSuccess: (data) => cache.setQueryData(queryKey, data),
  });
  const liked = likes.data?.liked ?? false;
  return (
    <div className="like-control">
      <Button
        variant="outline"
        className={liked ? "photo-liked" : ""}
        aria-label={liked ? "Bỏ thích ảnh" : "Thích ảnh"}
        aria-pressed={liked}
        title={liked ? "Bỏ thích ảnh" : "Thích ảnh"}
        disabled={!likes.data || mutation.isPending}
        onClick={() => {
          if (!me.data) {
            navigate("/login", {
              state: {
                returnTo: location.pathname + location.search,
              },
            });
            return;
          }
          mutation.mutate();
        }}
      >
        <Heart size={20} aria-hidden fill={liked ? "currentColor" : "none"} />
        <span>{likes.data?.count ?? 0}</span>
      </Button>
      <ErrorText error={likes.error || mutation.error} />
    </div>
  );
}

export function CommentSection({ photoId }: { photoId: string }) {
  const me = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const [body, setBody] = useState("");
  const [deleteCommentId, setDeleteCommentId] = useState<number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");
  const cache = useQueryClient();
  const queryKey = ["photo-comments", photoId];

  const comments = useQuery({
    queryKey,
    queryFn: () => api<PhotoComment[]>("photos/" + photoId + "/comments/"),
  });

  const postMutation = useMutation({
    mutationFn: () =>
      api<PhotoComment>("photos/" + photoId + "/comments/", {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: (newComment) => {
      setBody("");
      cache.setQueryData<PhotoComment[]>(queryKey, (old = []) => [
        ...old,
        newComment,
      ]);
      cache.invalidateQueries({ queryKey: ["photo", photoId] });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ commentId, text }: { commentId: number; text: string }) =>
      api<PhotoComment>("comments/" + commentId + "/", {
        method: "PATCH",
        body: JSON.stringify({ body: text }),
      }),
    onSuccess: (updatedComment) => {
      setEditingCommentId(null);
      setEditBody("");
      cache.setQueryData<PhotoComment[]>(queryKey, (old = []) =>
        old.map((c) => (c.id === updatedComment.id ? updatedComment : c)),
      );
      cache.invalidateQueries({ queryKey: ["photo", photoId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) =>
      api<void>("comments/" + commentId + "/", { method: "DELETE" }),
    onSuccess: (_, commentId) => {
      cache.setQueryData<PhotoComment[]>(queryKey, (old = []) =>
        old.filter((c) => c.id !== commentId),
      );
      cache.invalidateQueries({ queryKey: ["photo", photoId] });
    },
  });

  const commentList: PhotoComment[] = Array.isArray(comments.data)
    ? comments.data
    : ((comments.data as unknown as { results?: PhotoComment[] })?.results ??
      []);

  return (
    <section className="comments-section" aria-label="Bình luận">
      <h2>
        <MessageSquare size={18} aria-hidden />
        Bình luận <span>{commentList.length}</span>
      </h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!me.data) {
            navigate("/login", {
              state: {
                returnTo: location.pathname + location.search,
              },
            });
            return;
          }
          if (body.trim()) postMutation.mutate();
        }}
      >
        <textarea
          placeholder="Chia sẻ cảm nhận hoặc câu chuyện của bạn về bức ảnh này…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
        />
        <div className="comment-submit">
          <small>{1000 - body.length} ký tự còn lại</small>
          <Button disabled={!body.trim() || postMutation.isPending}>
            {postMutation.isPending ? "Đang gửi…" : "Gửi"}
          </Button>
        </div>
        <ErrorText error={postMutation.error} />
      </form>

      <ErrorText error={deleteMutation.error} />

      <div className="comments-list">
        {comments.isPending && <p className="small">Đang tải bình luận…</p>}
        {!comments.isPending && commentList.length === 0 && (
          <p className="small text-muted">
            Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ!
          </p>
        )}
        {commentList.map((comment) => (
          <article className="comment" key={comment.id}>
            <div>
              <strong>{comment.author_name}</strong>
              <small>{date(comment.created_at)}</small>
              {comment.is_owner && (
                <div
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    aria-label="Chỉnh sửa bình luận"
                    title="Chỉnh sửa bình luận"
                    disabled={
                      editMutation.isPending || deleteMutation.isPending
                    }
                    onClick={() => {
                      if (editingCommentId === comment.id) {
                        setEditingCommentId(null);
                        setEditBody("");
                      } else {
                        setEditingCommentId(comment.id);
                        setEditBody(comment.body);
                      }
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "var(--muted)",
                      cursor: "pointer",
                    }}
                  >
                    <Pencil size={13} aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label="Xóa bình luận"
                    title="Xóa bình luận"
                    disabled={
                      deleteMutation.isPending || editMutation.isPending
                    }
                    onClick={() => setDeleteCommentId(comment.id)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "var(--muted)",
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={13} aria-hidden />
                  </button>
                </div>
              )}
            </div>
            {editingCommentId === comment.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editBody.trim()) {
                    editMutation.mutate({
                      commentId: comment.id,
                      text: editBody,
                    });
                  }
                }}
                style={{ marginTop: "8px" }}
              >
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  maxLength={1000}
                  rows={2}
                  style={{ width: "100%", padding: "6px", fontSize: "14px" }}
                />
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    marginTop: "4px",
                  }}
                >
                  <small>{1000 - editBody.length} ký tự còn lại</small>
                  <div
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      gap: "6px",
                    }}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingCommentId(null);
                        setEditBody("");
                      }}
                      disabled={editMutation.isPending}
                    >
                      Hủy
                    </Button>
                    <Button
                      disabled={!editBody.trim() || editMutation.isPending}
                    >
                      {editMutation.isPending ? "Đang lưu…" : "Lưu"}
                    </Button>
                  </div>
                </div>
                <ErrorText error={editMutation.error} />
              </form>
            ) : (
              <p>{comment.body}</p>
            )}
          </article>
        ))}
      </div>

      <ConfirmDialog
        open={deleteCommentId !== null}
        title="Xóa bình luận?"
        description="Bình luận này sẽ bị xóa vĩnh viễn và không thể khôi phục."
        confirmLabel="Xóa"
        isDestructive
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteCommentId !== null) {
            deleteMutation.mutate(deleteCommentId, {
              onSettled: () => setDeleteCommentId(null),
            });
          }
        }}
        onCancel={() => setDeleteCommentId(null)}
      />
    </section>
  );
}
