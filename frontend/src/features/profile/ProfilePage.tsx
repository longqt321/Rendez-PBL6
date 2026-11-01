import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bookmark,
  Camera,
  MapPin,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";
import { api } from "../../lib/api/client";
import type { FeedItem, Page, VisualPlace } from "../../lib/api/types";
import { useMe } from "../../app/shared";
import { Avatar, Badge } from "../../components/ui/primitives";
import { Button } from "../../components/ui/button";
import { AsyncState, EmptyState } from "../../components/ui/states";
import { ExperienceCard } from "../experiences/ExperienceCard";
import { PlaceCard } from "../places/PlaceCard";

/**
 * Profile.
 *
 * The member's own record of the city: what they have contributed and what they
 * intend to visit. Those are two different collections, so they are two tabs
 * rather than one merged list — the same distinction the Saved page makes.
 *
 * `useMe` is imported from the legacy `app/shared` module on purpose: that
 * module re-exports the single session implementation from `lib/session`, and
 * keeping the import path stable lets the existing access-control tests keep
 * asserting the real guard behaviour.
 */
export function ProfilePage() {
  const me = useMe();
  const [params] = useSearchParams();
  const saved = params.get("tab") === "saved";

  if (me.isPending) return <AsyncState pending loadingVariant="grid" />;
  if (me.isError)
    return <AsyncState error={me.error} onRetry={() => void me.refetch()} />;
  if (!me.data) return null;

  const profile = me.data;

  return (
    <div className="profile-view">
      <header className="profile-banner">
        <Avatar name={profile.display_name} size="lg" />
        <div className="profile-banner__copy">
          <h1>{profile.display_name}</h1>
          <p className="profile-banner__meta">
            <span>
              <MapPin size={14} aria-hidden />
              Đà Nẵng, Việt Nam
            </span>
            <span aria-hidden>·</span>
            <span>{profile.email}</span>
          </p>
          <div className="profile-banner__badges">
            {profile.is_staff ? (
              <Badge tone="accent">
                <Shield size={12} aria-hidden /> Quản trị viên
              </Badge>
            ) : (
              <Badge>
                <Sparkles size={12} aria-hidden /> Thành viên Rendez
              </Badge>
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

      <dl className="profile-metrics">
        <div>
          <dt>Ảnh đã chia sẻ</dt>
          <dd className="tabular">{profile.photo_count ?? 0}</dd>
        </div>
        <div>
          <dt>Địa điểm đã lưu</dt>
          <dd className="tabular">{profile.saved_count ?? 0}</dd>
        </div>
      </dl>

      <nav className="segmented profile-switch" aria-label="Nội dung cá nhân">
        <Link to="/profile" aria-current={saved ? undefined : "page"}>
          <Camera size={16} aria-hidden />
          Ảnh đã đăng
        </Link>
        <Link to="/profile?tab=saved" aria-current={saved ? "page" : undefined}>
          <Bookmark size={16} aria-hidden />
          Đã lưu
        </Link>
      </nav>

      <ProfileCollection key={saved ? "saved" : "photos"} saved={saved} />
    </div>
  );
}

/**
 * One tab's content.
 *
 * Both queries are keyed by the member id so a different session can never read
 * the previous member's cached collection.
 */
function ProfileCollection({ saved }: { saved: boolean }) {
  const me = useMe();
  const userId = me.data?.id;

  const photos = useQuery({
    queryKey: ["user-submissions", userId, 1],
    enabled: !saved && Boolean(userId),
    queryFn: ({ signal }) =>
      api<Page<FeedItem>>("feed/?mine=true&page=1", { signal }),
  });

  const places = useQuery({
    queryKey: ["user-favorites", userId, 1],
    enabled: saved && Boolean(userId),
    queryFn: ({ signal }) =>
      api<Page<VisualPlace>>("favorites/?page=1", { signal }),
  });

  const result = saved ? places : photos;
  const items = result.data?.results ?? [];

  return (
    <section
      className="profile-collection"
      aria-label={saved ? "Địa điểm đã lưu" : "Ảnh đã đăng"}
    >
      <AsyncState
        pending={result.isPending}
        error={result.data ? null : result.error}
        onRetry={() => void result.refetch()}
        loadingVariant="grid"
      />

      {result.data && items.length === 0 && (
        <EmptyState
          title={
            saved
              ? "Chưa có địa điểm nào trong danh sách lưu"
              : "Bạn chưa chia sẻ khoảnh khắc nào"
          }
          body={
            saved
              ? "Hãy dạo quanh trang Khám phá và lưu lại các địa điểm tại Đà Nẵng mà bạn yêu thích."
              : "Đăng tải góc check-in, không gian hoặc đồ uống yêu thích của bạn để chia sẻ cùng cộng đồng Rendez."
          }
          icon={
            saved ? (
              <Bookmark size={24} aria-hidden />
            ) : (
              <Camera size={24} aria-hidden />
            )
          }
          actions={
            <>
              <Button asChild>
                <Link to={saved ? "/discover" : "/create"}>
                  {saved ? "Khám phá địa điểm" : "Đăng trải nghiệm đầu tiên"}
                </Link>
              </Button>
              {!saved && (
                <Button asChild variant="outline">
                  <Link to="/discover">Xem ảnh cộng đồng</Link>
                </Button>
              )}
            </>
          }
        />
      )}

      {items.length > 0 && saved && (
        <div className="card-grid">
          {(items as VisualPlace[]).map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      )}

      {items.length > 0 && !saved && (
        <div className="card-grid">
          {(items as FeedItem[]).map((item) => (
            <ExperienceCard key={item.photo.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
