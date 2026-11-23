import { Link } from "react-router"
import { CalendarIcon, MapPinIcon } from "lucide-react"
import { SurfaceCard } from "@/components/layout/page-primitives"
import { CoverImage } from "@/components/shared/cover-image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { formatCount, formatDate } from "@/lib/format"
import { useSetFollow } from "../hooks/use-set-follow"
import type { UserProfile } from "../types/profile"

interface ProfileHeaderProps {
  readonly profile: UserProfile
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const setFollow = useSetFollow(profile.handle)

  return (
    <header className="mb-6">
      <SurfaceCard padding="none" className="overflow-hidden">
        <div className="relative">
          <CoverImage
            src={profile.coverUrl ?? undefined}
            fallbackVariant="profile-cover"
            height={210}
            className="w-full border-b border-border/70"
            alt={`Ảnh bìa của ${profile.name}`}
          />
          <Avatar className="absolute -bottom-12 left-6 size-24 border-4 border-card bg-card shadow-(--shadow-raised)">
            {profile.avatarUrl && (
              <AvatarImage src={profile.avatarUrl} alt={`Ảnh đại diện của ${profile.name}`} />
            )}
            <AvatarFallback className="bg-accent text-xl font-bold text-accent-foreground">
              {profile.initials}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="px-5 pt-15 pb-6 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold tracking-tight break-words sm:text-3xl">
                {profile.name}
              </h1>
              <p className="text-sm text-muted-foreground">@{profile.handle}</p>
            </div>

            {profile.isMe ? (
              <Button variant="outline" render={<Link to="/settings" />}>
                Chỉnh sửa hồ sơ
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Toggle
                  variant={profile.followedByMe ? "outline" : "default"}
                  pressed={profile.followedByMe}
                  disabled={setFollow.isPending}
                  onPressedChange={(pressed) => setFollow.mutate({ followed: pressed })}
                >
                  {profile.followedByMe ? "Đang theo dõi" : "Theo dõi"}
                </Toggle>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link to={`/messages/${profile.handle}`} />}
                >
                  Nhắn tin
                </Button>
              </div>
            )}
          </div>

          {profile.bio ? (
            <p className="mt-3 max-w-prose text-sm leading-relaxed break-words text-foreground/90">
              {profile.bio}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {profile.location ? (
              <span className="flex items-center gap-1">
                <MapPinIcon className="size-3.5 text-primary" aria-hidden="true" />
                {profile.location}
              </span>
            ) : null}
            <span className="flex items-center gap-1">
              <CalendarIcon className="size-3.5" aria-hidden="true" />
              Tham gia {formatDate(profile.joinedAt)}
            </span>
          </div>

          {/* Editorial metrics strip */}
          <dl
            aria-label="Thống kê"
            className="mt-5 flex flex-wrap items-center gap-6 border-t border-border/60 pt-4"
          >
            <div className="flex items-baseline gap-1.5">
              <dt className="sr-only">Bài đăng</dt>
              <dd className="font-display text-xl font-bold tabular-nums">
                {formatCount(profile.postCount)}
              </dd>
              <span className="text-xs text-muted-foreground">Bài đăng</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="sr-only">Người theo dõi</dt>
              <dd className="font-display text-xl font-bold tabular-nums">
                {formatCount(profile.followerCount)}
              </dd>
              <span className="text-xs text-muted-foreground">Người theo dõi</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="sr-only">Đang theo dõi</dt>
              <dd className="font-display text-xl font-bold tabular-nums">
                {formatCount(profile.followingCount)}
              </dd>
              <span className="text-xs text-muted-foreground">Đang theo dõi</span>
            </div>
          </dl>
        </div>
      </SurfaceCard>
    </header>
  )
}
