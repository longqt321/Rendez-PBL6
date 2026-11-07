import { Link } from "react-router"
import { MapPinIcon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Item, ItemContent, ItemGroup } from "@/components/ui/item"
import { SeedImage } from "@/components/shared/seed-image"
import { formatCount } from "@/lib/format"
import { useSetFollow } from "../hooks/use-set-follow"
import type { UserProfile } from "../types/profile"

interface ProfileHeaderProps {
  profile: UserProfile
}

/** Ảnh bìa + avatar 96px đè lên + tên/bio + stats + nút Theo dõi hoặc Sửa. */
export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const setFollow = useSetFollow(profile.handle)

  return (
    <header>
      <div className="relative">
        <SeedImage
          seed={`cover-${profile.handle}`}
          height={200}
          className="w-full rounded-none border-0 border-b border-border"
          alt={`Ảnh bìa của ${profile.name}`}
        />
        <Avatar className="absolute -bottom-12 left-6 size-24 border-4 border-background bg-background">
          <AvatarFallback className="bg-accent text-xl font-bold text-accent-foreground">
            {profile.initials}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="px-4 pt-14 pb-4 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-bold tracking-tight">{profile.name}</h1>
            <p className="text-sm text-muted-foreground">@{profile.handle}</p>
          </div>

          {profile.isMe ? (
            <Button variant="outline" render={<Link to="/settings" />}>
              Chỉnh sửa hồ sơ
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant={profile.followedByMe ? "outline" : "default"}
                aria-pressed={profile.followedByMe}
                disabled={setFollow.isPending}
                onClick={() => setFollow.mutate({ followed: !profile.followedByMe })}
              >
                {profile.followedByMe ? "Đang theo dõi" : "Theo dõi"}
              </Button>
              <Button variant="outline">Nhắn tin</Button>
            </div>
          )}
        </div>

        <p className="mt-3 max-w-prose text-sm leading-relaxed">{profile.bio}</p>

        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPinIcon className="size-3.5" aria-hidden="true" />
            {profile.location}
          </span>
          <span>Tham gia {new Date(profile.joinedAt).toLocaleDateString("vi-VN")}</span>
        </p>

        <ItemGroup className="mt-4 grid grid-cols-3 gap-2" role="list" aria-label="Thống kê">
          <Item variant="muted" className="flex-col items-center gap-0.5 py-3">
            <ItemContent className="items-center">
              <span className="font-heading text-lg font-bold">
                {formatCount(profile.postCount)}
              </span>
              <span className="text-[0.78rem] text-muted-foreground">Bài đăng</span>
            </ItemContent>
          </Item>
          <Item variant="muted" className="flex-col items-center gap-0.5 py-3">
            <ItemContent className="items-center">
              <span className="font-heading text-lg font-bold">
                {formatCount(profile.followerCount)}
              </span>
              <span className="text-[0.78rem] text-muted-foreground">Người theo dõi</span>
            </ItemContent>
          </Item>
          <Item variant="muted" className="flex-col items-center gap-0.5 py-3">
            <ItemContent className="items-center">
              <span className="font-heading text-lg font-bold">
                {formatCount(profile.followingCount)}
              </span>
              <span className="text-[0.78rem] text-muted-foreground">Đang theo dõi</span>
            </ItemContent>
          </Item>
        </ItemGroup>
      </div>
    </header>
  )
}
