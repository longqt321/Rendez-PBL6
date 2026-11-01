import { Link } from "react-router";
import { Bookmark, Heart, Plus } from "lucide-react";
import { useSavedPlaces, useSavedPosts } from "../../lib/api/queries";
import { useMe } from "../../lib/session";
import { formatRelative } from "../../lib/format";
import { AsyncState, EmptyState } from "../../components/ui/states";
import { Button } from "../../components/ui/button";
import { SafeImage } from "../../components/ui/safe-image";
import { PlaceCard } from "../places/PlaceCard";

/**
 * Saved.
 *
 * Two different things are saved in Rendez and conflating them would be a lie:
 *   - Places   — somewhere the member wants to go
 *   - Experiences — someone else's post the member wants to keep
 *
 * They are shown as two clearly labelled groups so the collection stays
 * meaningful. Both are fetched in parallel; one failing does not hide the other.
 */
export function SavedPage() {
  const me = useMe();
  const userId = me.data?.id;

  const places = useSavedPlaces("page_size=24", userId);
  const posts = useSavedPosts(userId);

  const savedPlaces = places.data?.results ?? [];
  const savedPosts = posts.data?.results ?? [];

  const bothEmpty =
    places.data &&
    posts.data &&
    savedPlaces.length === 0 &&
    savedPosts.length === 0;

  return (
    <div className="saved-page">
      <header className="page-head">
        <div className="page-head__copy">
          <p className="eyebrow">Bộ sưu tập của bạn</p>
          <h1>Đã lưu</h1>
          <p className="lede">
            Những nơi bạn muốn ghé, và những trải nghiệm bạn muốn xem lại.
          </p>
        </div>
      </header>

      {bothEmpty ? (
        <EmptyState
          title="Bạn chưa lưu gì"
          body="Khi bạn lưu một địa điểm hoặc một trải nghiệm, nó sẽ xuất hiện ở đây để bạn tìm lại dễ dàng."
          icon={<Bookmark size={24} aria-hidden />}
          actions={
            <Button asChild>
              <Link to="/discover">Khám phá địa điểm</Link>
            </Button>
          }
        />
      ) : (
        <>
          <section
            className="saved-section"
            aria-labelledby="saved-places-heading"
          >
            <div className="section-head">
              <div>
                <p className="eyebrow">Địa điểm</p>
                <h2
                  id="saved-places-heading"
                  className="editorial section-head__title"
                >
                  Nơi bạn muốn ghé
                </h2>
              </div>
              {places.data && (
                <span className="muted small tabular">
                  {places.data.count} địa điểm
                </span>
              )}
            </div>

            <AsyncState
              pending={places.isPending}
              error={places.data ? null : places.error}
              onRetry={() => void places.refetch()}
              loadingVariant="grid"
            />

            {places.data && savedPlaces.length === 0 && (
              <EmptyState
                compact
                title="Chưa lưu địa điểm nào"
                body="Bấm biểu tượng dấu trang trên một địa điểm để lưu lại."
                actions={
                  <Button asChild variant="outline" size="sm">
                    <Link to="/search">Tìm địa điểm</Link>
                  </Button>
                }
              />
            )}

            {savedPlaces.length > 0 && (
              <div className="card-grid">
                {savedPlaces.map((place) => (
                  <PlaceCard key={place.id} place={place} />
                ))}
              </div>
            )}
          </section>

          <section
            className="saved-section"
            aria-labelledby="saved-posts-heading"
          >
            <div className="section-head">
              <div>
                <p className="eyebrow">Trải nghiệm</p>
                <h2
                  id="saved-posts-heading"
                  className="editorial section-head__title"
                >
                  Trải nghiệm bạn giữ lại
                </h2>
              </div>
              {posts.data && (
                <span className="muted small tabular">
                  {posts.data.count} trải nghiệm
                </span>
              )}
            </div>

            <AsyncState
              pending={posts.isPending}
              error={posts.data ? null : posts.error}
              onRetry={() => void posts.refetch()}
              loadingVariant="list"
            />

            {posts.data && savedPosts.length === 0 && (
              <EmptyState
                compact
                title="Chưa lưu trải nghiệm nào"
                body="Mở một trải nghiệm từ cộng đồng và bấm Lưu để giữ lại."
                actions={
                  <Button asChild variant="outline" size="sm">
                    <Link to="/posts">Xem trải nghiệm</Link>
                  </Button>
                }
              />
            )}

            {savedPosts.length > 0 && (
              <ul className="saved-post-list" role="list">
                {savedPosts.map((post) => {
                  const cover = post.media.find(
                    (item) => item.status === "published" || !item.status,
                  );
                  return (
                    <li key={post.id}>
                      <Link className="saved-post" to={"/posts/" + post.id}>
                        {cover && (
                          <SafeImage
                            sources={[cover.media_url]}
                            alt={
                              cover.alt_text || post.caption || post.place_name
                            }
                            ratio="1 / 1"
                            className="saved-post__media"
                          />
                        )}
                        <div className="saved-post__body">
                          <p className="saved-post__place">{post.place_name}</p>
                          {post.caption && (
                            <p className="saved-post__caption line-clamp-2">
                              {post.caption}
                            </p>
                          )}
                          <p className="saved-post__meta">
                            <Heart size={12} aria-hidden />
                            <span className="tabular">{post.like_count}</span>
                            <span>·</span>
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

          <div className="saved-cta">
            <Button asChild variant="outline">
              <Link to="/create">
                <Plus size={16} aria-hidden />
                Đăng trải nghiệm của bạn
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
