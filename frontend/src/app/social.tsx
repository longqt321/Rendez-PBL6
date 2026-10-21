import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Share2, Trash2, Pencil, Check } from "lucide-react";
import { useNavigate } from "react-router";
import { useState } from "react";
import { api, date } from "../lib/api/client";
import type { PublicPhoto } from "../lib/api/visual";
import { Button } from "../components/ui/button";
import { ErrorText } from "./shared";

export function PhotoCredit({ photo }: { photo: PublicPhoto }) {
  return (
    <div className="photo-credit">
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
    </div>
  );
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

type Likes = { liked: boolean; count: number };

export function LikeButton({ photoId }: { photoId: string }) {
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
        onClick={() => mutation.mutate()}
      >
        <Heart size={20} aria-hidden fill={liked ? "currentColor" : "none"} />
        <span>{likes.data?.count ?? 0}</span>
      </Button>
      <ErrorText error={likes.error || mutation.error} />
    </div>
  );
}
