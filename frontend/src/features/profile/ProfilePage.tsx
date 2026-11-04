import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Camera, Settings, Shield } from "lucide-react";
import { api } from "../../lib/api/client";
import type { FeedItem, Page, Post, VisualPlace } from "../../lib/api/types";
import { useMe } from "../../lib/session";
import { useSavedPosts } from "../../lib/api/queries";
import { formatRelative } from "../../lib/format";
import { Avatar, Badge } from "../../components/ui/primitives";
import { Button } from "../../components/ui/button";
import { AsyncState, EmptyState } from "../../components/ui/states";
import { SafeImage } from "../../components/ui/safe-image";
import { ExperienceCard } from "../experiences/ExperienceCard";
import { PlaceCard } from "../places/PlaceCard";

/**
 * Profile.
 *
 * The member's own record of the city. Three tabs, one screen:
 *   Ảnh đã đăng   — what they contributed
 *   Đã lưu        — places they intend to visit
 *   Ảnh đã lưu    — community posts they want to re-read
 *
 * Saved places and saved posts are different objects, so they stay separate
 * tabs rather than one merged list.
 */
export function ProfilePage() {
  const me = useMe();
  const [params] = useSearchParams();
  const tab = params.get("tab") ?? "photos";

  if (me.isPending) return <AsyncState pending loadingVariant="grid" />;
  if (me.isError)
    return <AsyncState error={me.error} onRetry={() => void me.refetch()} />;
  if (!me.data) return null;

  const profile = me.data;

  return (
    <div className="profile-view max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
      <header className="profile-banner flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
        <div className="flex items-center gap-4">
          <Avatar name={profile.display_name} size="lg" />
          <div className="profile-banner__copy flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{profile.display_name}</h1>
            <p className="profile-banner__meta text-sm text-neutral-500 dark:text-neutral-400">
              <span>{profile.email}</span>
            </p>
            {profile.is_staff && (
              <div className="profile-banner__badges mt-1">
                <Badge tone="accent">
                  <Shield size={12} aria-hidden /> Quản trị viên
                </Badge>
              </div>
            )}
          </div>
        </div>
        <Button asChild variant="outline">
          <Link to="/settings">
            <Settings size={16} aria-hidden />
            Cài đặt
          </Link>
        </Button>
      </header>

      <dl className="profile-metrics grid grid-cols-2 gap-4">
        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
          <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Ảnh đã chia sẻ</dt>
          <dd className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tabular mt-1">{profile.photo_count ?? 0}</dd>
        </div>
        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
          <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Địa điểm đã lưu</dt>
          <dd className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tabular mt-1">{profile.saved_count ?? 0}</dd>
        </div>
      </dl>

      <nav className="segmented profile-switch flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl gap-1 max-w-fit" aria-label="Nội dung cá nhân">
        <Link
          to="/profile"
          aria-current={tab === "photos" ? "page" : undefined}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "photos"
              ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          <Camera size={16} aria-hidden />
          Ảnh đã đăng
        </Link>
        <Link
          to="/profile?tab=saved"
          aria-current={tab === "saved" ? "page" : undefined}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "saved"
              ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          <Bookmark size={16} aria-hidden />
          Địa điểm đã lưu
        </Link>
        <Link
          to="/profile?tab=posts"
          aria-current={tab === "posts" ? "page" : undefined}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "posts"
              ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          <Bookmark size={16} aria-hidden />
          Ảnh đã lưu
        </Link>
      </nav>

      {tab === "photos" && <ProfilePhotos key="photos" />}
      {tab === "saved" && <ProfileSavedPlaces key="saved" />}
      {tab === "posts" && <ProfileSavedPosts key="posts" />}
    </div>
  );
}

/** One tab's content. Queries are keyed by the member id so a different
 * session can never read the previous member's cached collection. */
function ProfilePhotos() {
  const me = useMe();
  const userId = me.data?.id;

  const photos = useQuery({
    queryKey: ["user-submissions", userId, 1],
    enabled: Boolean(userId),
    queryFn: ({ signal }) =>
      api<Page<FeedItem>>("feed/?mine=true&page=1", { signal }),
  });

  const items = photos.data?.results ?? [];

  return (
    <section className="profile-collection" aria-label="Ảnh đã đăng">
      <AsyncState
        pending={photos.isPending}
        error={photos.data ? null : photos.error}
        onRetry={() => void photos.refetch()}
        loadingVariant="grid"
      />

      {photos.data && items.length === 0 && (
        <EmptyState
          title="Bạn chưa chia sẻ khoảnh khắc nào"
          body="Đăng ảnh từ một địa điểm bạn vừa ghé để bắt đầu bộ sưu tập."
          icon={<Camera size={24} aria-hidden />}
          actions={
            <Button asChild>
              <Link to="/create">Đăng ảnh đầu tiên</Link>
            </Button>
          }
        />
      )}

      {items.length > 0 && (
        <div className="card-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {(items as FeedItem[]).map((item) => (
            <ExperienceCard key={item.photo.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function ProfileSavedPlaces() {
  const me = useMe();
  const userId = me.data?.id;

  const places = useQuery({
    queryKey: ["user-favorites", userId, 1],
    enabled: Boolean(userId),
    queryFn: ({ signal }) =>
      api<Page<VisualPlace>>("favorites/?page=1", { signal }),
  });

  const items = places.data?.results ?? [];

  return (
    <section className="profile-collection flex flex-col gap-4" aria-label="Địa điểm đã lưu">
      <AsyncState
        pending={places.isPending}
        error={places.data ? null : places.error}
        onRetry={() => void places.refetch()}
        loadingVariant="grid"
      />

      {places.data && items.length === 0 && (
        <EmptyState
          title="Chưa có địa điểm nào trong danh sách lưu"
          body="Bấm biểu tượng dấu trang trên một địa điểm để lưu lại."
          icon={<Bookmark size={24} aria-hidden />}
          actions={
            <Button asChild variant="outline">
              <Link to="/map">Tìm địa điểm</Link>
            </Button>
          }
        />
      )}

      {items.length > 0 && (
        <div className="card-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {(items as VisualPlace[]).map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      )}
    </section>
  );
}

function ProfileSavedPosts() {
  const me = useMe();
  const posts = useSavedPosts(me.data?.id);

  const items = posts.data?.results ?? [];

  return (
    <section className="profile-collection flex flex-col gap-4" aria-label="Ảnh đã lưu">
      <AsyncState
        pending={posts.isPending}
        error={posts.data ? null : posts.error}
        onRetry={() => void posts.refetch()}
        loadingVariant="grid"
      />

      {posts.data && items.length === 0 && (
        <EmptyState
          title="Chưa lưu ảnh nào"
          body="Mở một ảnh từ cộng đồng và bấm Lưu để giữ lại."
          icon={<Bookmark size={24} aria-hidden />}
          actions={
            <Button asChild variant="outline">
              <Link to="/discover">Xem ảnh</Link>
            </Button>
          }
        />
      )}

      {items.length > 0 && (
        <ul className="saved-post-list flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800" role="list">
          {items.map((post: Post) => {
            const cover = post.media.find(
              (item) => item.status === "published" || !item.status,
            );
            return (
              <li key={post.id} className="py-4">
                <Link className="saved-post flex gap-4 items-center group" to={"/posts/" + post.id}>
                  {cover && (
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-neutral-100 dark:bg-neutral-800">
                      <SafeImage
                        sources={[cover.media_url]}
                        alt={
                          cover.alt_text || post.caption || post.place_name
                        }
                        ratio="1 / 1"
                        className="saved-post__media group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  <div className="saved-post__body flex-1 min-w-0">
                    <p className="saved-post__place font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 transition-colors">{post.place_name}</p>
                    {post.caption && (
                      <p className="saved-post__caption line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        {post.caption}
                      </p>
                    )}
                    <p className="saved-post__meta text-xs text-neutral-400 mt-1">
                      <span>{formatRelative(post.published_at)}</span>
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
