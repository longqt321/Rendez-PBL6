import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { ArrowLeft, Camera, Calendar } from "lucide-react";
import { api, date, type Page } from "../lib/api/client";
import type { Creator, PublicPhoto } from "../lib/api/visual";
import { State } from "./shared";
import { MasonryFeed } from "./masonry";

export function CreatorProfilePage() {
  const { id } = useParams();

  const creator = useQuery({
    queryKey: ["creator", id],
    queryFn: () => api<Creator>("creators/" + id + "/"),
  });

  const photos = useQuery({
    queryKey: ["creator-photos", id],
    queryFn: () => api<Page<PublicPhoto>>("creators/" + id + "/photos/"),
  });

  if (!creator.data) {
    return (
      <State
        pending={creator.isPending}
        error={creator.error}
        onRetry={() => void creator.refetch()}
      />
    );
  }

  const profile = creator.data;
  const photoList = photos.data?.results || [];

  return (
    <div className="profile-layout">
      <Link
        to="/discover"
        className="back-link mb-4 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft size={16} aria-hidden />
        Về Khám phá
      </Link>

      <header className="profile-header">
        <div className="profile-avatar" aria-hidden>
          {profile.display_name.slice(0, 1).toUpperCase()}
        </div>
        <div className="profile-identity">
          <h1>{profile.display_name}</h1>
          <div className="profile-stats flex flex-wrap gap-4 text-sm text-muted mt-2">
            <span className="inline-flex items-center gap-1">
              <Camera size={15} aria-hidden />
              {profile.photo_count} ảnh đã chia sẻ
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar size={15} aria-hidden />
              Tham gia {date(profile.joined_at)}
            </span>
          </div>
        </div>
      </header>

      <section className="profile-content mt-8" aria-label="Ảnh của người dùng">
        <h2 className="text-xl font-semibold mb-4">Ảnh công khai</h2>

        {photos.isPending && (
          <p className="text-muted text-sm">Đang tải bộ sưu tập ảnh…</p>
        )}

        {photoList.length === 0 && !photos.isPending && (
          <p className="profile-empty text-muted text-sm">
            Tác giả chưa có ảnh công khai nào.
          </p>
        )}

        {photoList.length > 0 && (
          <MasonryFeed className="pin-feed">
            {photoList.map((photo) => (
              <article className="place-card photo-card" key={photo.id}>
                <div className="pin-body">
                  <div className="photo-card-media">
                    <Link
                      to={"/photos/" + photo.id}
                      aria-label={"Xem ảnh của " + photo.caption}
                    >
                      <img
                        className="card-image platform-photo"
                        src={photo.url}
                        alt={photo.alt_text || photo.caption || "Ảnh địa điểm"}
                        width={photo.width}
                        height={photo.height}
                        style={
                          photo.width && photo.height
                            ? {
                                aspectRatio: `${photo.width} / ${photo.height}`,
                              }
                            : undefined
                        }
                        loading="lazy"
                        decoding="async"
                      />
                    </Link>
                  </div>
                  {photo.caption && (
                    <p className="card-caption line-clamp-2">{photo.caption}</p>
                  )}
                </div>
              </article>
            ))}
          </MasonryFeed>
        )}
      </section>
    </div>
  );
}
