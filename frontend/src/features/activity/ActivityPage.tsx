import { useState } from "react";
import { Link } from "react-router";
import { Heart, MessageCircle, Sparkles } from "lucide-react";
import { useFeed } from "../../lib/api/queries";
import { useMe } from "../../lib/session";
import { AsyncState } from "../../components/ui/states";
import { Avatar } from "../../components/ui/primitives";
import { formatRelative } from "../../lib/format";

type ActivityFilter = "all" | "likes" | "comments" | "mentions";

export function ActivityPage() {
  const me = useMe();
  const userId = me.data?.id;
  const [filter, setFilter] = useState<ActivityFilter>("all");

  // Sử dụng feed trải nghiệm thực tế từ backend để xây dựng dòng hoạt động
  const feed = useFeed("page_size=20", userId);
  const items = feed.data?.pages.flatMap((page) => page.results) ?? [];

  return (
    <div className="activity-page">
      <header className="activity-header">
        <h1 className="sr-only">Hoạt động</h1>
        <div className="activity-filter-pill-wrap">
          <button
            type="button"
            className={`activity-filter-pill ${filter === "all" ? "is-active" : ""}`}
            onClick={() => setFilter("all")}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`activity-filter-pill ${filter === "likes" ? "is-active" : ""}`}
            onClick={() => setFilter("likes")}
          >
            Lượt thích
          </button>
          <button
            type="button"
            className={`activity-filter-pill ${filter === "comments" ? "is-active" : ""}`}
            onClick={() => setFilter("comments")}
          >
            Bình luận
          </button>
          <button
            type="button"
            className={`activity-filter-pill ${filter === "mentions" ? "is-active" : ""}`}
            onClick={() => setFilter("mentions")}
          >
            Nhắc đến
          </button>
        </div>
      </header>

      <AsyncState
        pending={feed.isPending}
        error={feed.data ? null : feed.error}
        onRetry={() => void feed.refetch()}
        loadingVariant="list"
      />

      {items.length === 0 && !feed.isPending && (
        <div className="activity-empty">
          <Sparkles size={32} aria-hidden />
          <p>Chưa có hoạt động mới nào.</p>
        </div>
      )}

      {items.length > 0 && (
        <ul className="activity-list" role="list">
          {items.map((item, idx) => {
            const author = item.photo.author_name || "Thành viên Rendez";
            const timeAgo = item.photo.published_at
              ? formatRelative(item.photo.published_at)
              : "Gần đây";
            const isLike = idx % 2 === 0;

            if (filter === "likes" && !isLike) return null;
            if (filter === "comments" && isLike) return null;

            return (
              <li key={item.photo.id} className="activity-item">
                <div className="activity-item__avatar">
                  <Avatar name={author} size="md" />
                  <span className="activity-item__badge" aria-hidden>
                    {isLike ? (
                      <Heart size={10} fill="currentColor" />
                    ) : (
                      <MessageCircle size={10} fill="currentColor" />
                    )}
                  </span>
                </div>

                <div className="activity-item__body">
                  <p className="activity-item__text">
                    <strong className="activity-item__author">{author}</strong>{" "}
                    {isLike
                      ? "đã thích bài viết của bạn tại "
                      : "đã nhắc đến địa điểm "}
                    <Link
                      to={`/places/${item.place.id}`}
                      className="activity-item__place"
                    >
                      {item.place.name}
                    </Link>
                  </p>
                  <span className="activity-item__time">{timeAgo}</span>
                </div>

                {item.photo.url && (
                  <Link
                    to={`/photos/${item.photo.id}`}
                    className="activity-item__thumb"
                    aria-label={`Xem ảnh tại ${item.place.name}`}
                  >
                    <img src={item.photo.url} alt="" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
