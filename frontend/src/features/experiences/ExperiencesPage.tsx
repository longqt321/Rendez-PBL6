import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Heart, Images, MessageCircle, Plus } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "../../lib/api/client";
import type { Page, Post } from "../../lib/api/types";
import { useMe } from "../../lib/session";
import { formatRelative } from "../../lib/format";
import { AsyncState, EmptyState } from "../../components/ui/states";
import { Button } from "../../components/ui/button";
import { Avatar } from "../../components/ui/primitives";
import { SafeImage } from "../../components/ui/safe-image";

/**
 * Community experiences feed.
 *
 * A post can carry several images, so the card exposes them as a small
 * gallery with explicit controls rather than an auto-playing carousel —
 * motion the user did not ask for is a distraction, not a feature.
 */
export function ExperiencesPage() {
  const me = useMe();
  const sentinel = useRef<HTMLDivElement>(null);

  const feed = useInfiniteQuery({
    queryKey: ["posts-feed", me.data?.id],
    initialPageParam: "1",
    queryFn: ({ signal, pageParam }) =>
      api<Page<Post>>("posts/?page=" + pageParam, { signal }),
    getNextPageParam: (last) => {
      if (!last.next) return undefined;
      return (
        new URL(last.next, window.location.origin).searchParams.get("page") ??
        undefined
      );
    },
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feed;

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((entry) => entry.isIntersecting) &&
          hasNextPage &&
          !isFetchingNextPage
        ) {
          void fetchNextPage();
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = feed.data?.pages.flatMap((page) => page.results) ?? [];

  return (
    <div className="feed-page">
      <header className="page-head">
        <div className="page-head__copy">
          <p className="eyebrow">Cộng đồng</p>
          <h1>Trải nghiệm</h1>
          <p className="lede">
            Những gì người khác đã thấy, đã ngồi và đã chụp lại. Mở một trải
            nghiệm để biết nó thuộc về địa điểm nào.
          </p>
        </div>
        <div className="page-head__actions">
          <Button asChild>
            <Link to="/create">
              <Plus size={16} aria-hidden />
              Đăng trải nghiệm
            </Link>
          </Button>
        </div>
      </header>

      <AsyncState
        pending={feed.isPending}
        error={feed.data ? null : feed.error}
        onRetry={() => void feed.refetch()}
        loadingVariant="list"
      />

      {feed.data && posts.length === 0 && (
        <EmptyState
          title="Chưa có trải nghiệm nào"
          body="Hãy là người đầu tiên chia sẻ một địa điểm bạn vừa ghé."
          icon={<Images size={24} aria-hidden />}
          actions={
            <Button asChild>
              <Link to="/create">Đăng trải nghiệm</Link>
            </Button>
          }
        />
      )}

      {posts.length > 0 && (
        <ul className="feed-list" role="list">
          {posts.map((post, index) => (
            <li key={post.id}>
              <ExperiencePost post={post} eager={index === 0} />
            </li>
          ))}
        </ul>
      )}

      <div ref={sentinel} aria-hidden="true" />

      {isFetchingNextPage && (
        <p className="muted small" role="status">
          Đang tải thêm…
        </p>
      )}

      {feed.data && !hasNextPage && posts.length > 0 && (
        <p className="feed-end muted small">Bạn đã xem hết trải nghiệm.</p>
      )}
    </div>
  );
}

function ExperiencePost({ post, eager }: { post: Post; eager: boolean }) {
  const published = post.media.filter(
    (media) => media.status === "published" || !media.status,
  );
  const [index, setIndex] = useState(0);
  const current = published[Math.min(index, published.length - 1)];

  return (
    <article className="feed-post">
      <header className="feed-post__head">
        <Avatar name={post.author_name} />
        <div className="feed-post__byline">
          <span className="feed-post__author">{post.author_name}</span>
          {post.place && post.place_name && (
            <Link className="feed-post__place" to={"/places/" + post.place}>
              {post.place_name}
            </Link>
          )}
        </div>
        <time
          className="feed-post__time"
          dateTime={post.published_at ?? undefined}
        >
          {formatRelative(post.published_at)}
        </time>
      </header>

      {current && (
        <Link
          className="feed-post__media"
          to={"/posts/" + post.id}
          aria-label={"Mở trải nghiệm của " + post.author_name}
        >
          <SafeImage
            sources={[current.media_url]}
            alt={current.alt_text || post.caption || post.place_name}
            ratio="4 / 3"
            eager={eager}
          />
        </Link>
      )}

      {published.length > 1 && (
        <div className="feed-post__thumbs">
          {published.map((media, position) => (
            <button
              key={media.id}
              type="button"
              className="feed-post__thumb"
              aria-label={"Xem ảnh " + (position + 1)}
              aria-pressed={position === index}
              onClick={() => setIndex(position)}
            >
              <SafeImage
                sources={[media.media_url]}
                alt={media.alt_text || ""}
                ratio="1 / 1"
              />
            </button>
          ))}
        </div>
      )}

      {post.caption && <p className="feed-post__caption">{post.caption}</p>}

      {post.origin === "seed" && (
        <p className="feed-post__origin">
          Ảnh tư liệu minh họa do Rendez cung cấp
        </p>
      )}

      <footer className="feed-post__actions">
        <span className="feed-post__stat">
          <Heart size={16} aria-hidden />
          <span className="tabular">{post.like_count}</span>
          <span className="sr-only">lượt thích</span>
        </span>
        <Link className="feed-post__stat" to={"/posts/" + post.id}>
          <MessageCircle size={16} aria-hidden />
          <span className="tabular">{post.comment_count}</span>
          <span className="sr-only">bình luận — mở chi tiết</span>
        </Link>
      </footer>
    </article>
  );
}
