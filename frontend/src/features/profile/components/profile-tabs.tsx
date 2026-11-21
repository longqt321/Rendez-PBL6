import { useSearchParams } from "react-router"
import { LockIcon } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { useProfilePosts } from "../hooks/use-profile-posts"
import type { ProfileTab, UserProfile } from "../types/profile"
import { ProfileCollectionGrid } from "./profile-collection-grid"
import { ProfilePostGrid } from "./profile-post-grid"

interface ProfileTabsProps {
  readonly profile: UserProfile
}

const POST_TABS: ProfileTab[] = ["posts", "pinned", "saved"]
const TAB_VALUES = ["posts", "pinned", "saved", "collections"] as const
type TabValue = (typeof TAB_VALUES)[number]

function isTabValue(value: string | null): value is TabValue {
  return value !== null && (TAB_VALUES as readonly string[]).includes(value)
}

export function ProfileTabs({ profile }: ProfileTabsProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get("tab")
  const tab: TabValue =
    isTabValue(rawTab) && (rawTab !== "saved" || profile.isMe) ? rawTab : "posts"

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setSearchParams(value === "posts" ? {} : { tab: String(value) })}
    >
      <TabsList>
        <TabsTrigger value="posts">Bài đăng</TabsTrigger>
        {profile.isMe && <TabsTrigger value="pinned">Đã ghim</TabsTrigger>}
        {profile.isMe && <TabsTrigger value="saved">Đã lưu</TabsTrigger>}
        <TabsTrigger value="collections">Bộ sưu tập</TabsTrigger>
      </TabsList>

      {POST_TABS.map((value) => (
        <TabsContent key={value} value={value} className="mt-4">
          <ProfileTabContent profile={profile} tab={value} />
        </TabsContent>
      ))}

      <TabsContent value="collections" className="mt-4">
        {profile.privateProfile && !profile.isMe ? (
          <PrivateProfileNotice />
        ) : (
          <ProfileCollectionGrid handle={profile.handle} isMe={profile.isMe} />
        )}
      </TabsContent>
    </Tabs>
  )
}

function PrivateProfileNotice() {
  return (
    <Empty className="mt-2">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LockIcon />
        </EmptyMedia>
        <EmptyTitle>Hồ sơ riêng tư</EmptyTitle>
        <EmptyDescription>
          Người này đã đặt hồ sơ ở chế độ riêng tư, chỉ chính họ xem được bài đăng và bộ sưu tập.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function ProfileTabContent({ profile, tab }: Readonly<{ profile: UserProfile; tab: ProfileTab }>) {
  // Server trả 403 cho dữ liệu riêng của hồ sơ riêng tư — chặn trước khi gọi,
  // tránh mỗi tab bắn request chỉ để nhận 403 (và để hook không gọi có điều kiện).
  if (profile.privateProfile && !profile.isMe) return <PrivateProfileNotice />
  return <ProfileTabContentInner profile={profile} tab={tab} />
}

function ProfileTabContentInner({
  profile,
  tab,
}: Readonly<{ profile: UserProfile; tab: ProfileTab }>) {
  const { data, isPending, isError, refetch } = useProfilePosts(profile.handle, tab)
  const posts = data?.pages.flatMap((page) => page.items) ?? []

  const copy = {
    posts: {
      title: "Chưa có bài đăng nào",
      description: "Bài đăng của người này sẽ xuất hiện ở đây.",
    },
    pinned: {
      title: "Chưa ghim bài nào",
      description: "Ghim bài đăng để luôn thấy chúng ở đầu trang cá nhân.",
    },
    saved: {
      title: "Chưa lưu bài nào",
      description: "Các bài bạn lưu sẽ nằm ở đây và chỉ mình bạn nhìn thấy.",
    },
  }[tab]

  return (
    <ProfilePostGrid
      posts={posts}
      isPending={isPending}
      isError={isError}
      onRetry={() => {
        refetch().catch(() => {})
      }}
      emptyTitle={copy.title}
      emptyDescription={copy.description}
    />
  )
}
