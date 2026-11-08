import { useSearchParams } from "react-router"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useProfilePosts } from "../hooks/use-profile-posts"
import type { ProfileTab, UserProfile } from "../types/profile"
import { ProfileCollectionGrid } from "./profile-collection-grid"
import { ProfilePostGrid } from "./profile-post-grid"

interface ProfileTabsProps {
  profile: UserProfile
}

const POST_TABS: ProfileTab[] = ["posts", "pinned", "saved"]
const TAB_VALUES = ["posts", "pinned", "saved", "collections"] as const
type TabValue = (typeof TAB_VALUES)[number]

/** `?tab=` là chuỗi tuỳ ý từ URL — chỉ nhận giá trị nằm trong danh sách tab. */
function isTabValue(value: string | null): value is TabValue {
  return TAB_VALUES.some((tab) => tab === value)
}

/** Tabs Bài đăng / Đã ghim / Đã lưu / Bộ sưu tập — đồng bộ với query `?tab=`. */
export function ProfileTabs({ profile }: ProfileTabsProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get("tab")
  const tab: TabValue =
    isTabValue(rawTab) && (rawTab !== "saved" || profile.isMe) ? rawTab : "posts"

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setSearchParams(value === "posts" ? {} : { tab: value })}
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
        <ProfileCollectionGrid handle={profile.handle} isMe={profile.isMe} />
      </TabsContent>
    </Tabs>
  )
}

function ProfileTabContent({ profile, tab }: { profile: UserProfile; tab: ProfileTab }) {
  const { data, isPending } = useProfilePosts(profile.handle, tab)
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
      description: "Các bài bạn lưu sẽ nằm ở đây — chỉ mình bạn nhìn thấy.",
    },
  }[tab]

  return (
    <ProfilePostGrid
      posts={posts}
      isPending={isPending}
      emptyTitle={copy.title}
      emptyDescription={copy.description}
    />
  )
}
