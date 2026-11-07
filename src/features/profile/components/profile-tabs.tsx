import { useSearchParams } from "react-router"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useProfilePosts } from "../hooks/use-profile-posts"
import type { UserProfile } from "../types/profile"
import { ProfilePostGrid } from "./profile-post-grid"

interface ProfileTabsProps {
  profile: UserProfile
}

const TAB_VALUES = ["posts", "pinned", "saved"] as const

/** Tabs Bài đăng / Đã ghim / Đã lưu — tab đồng bộ với query `?tab=`. */
export function ProfileTabs({ profile }: ProfileTabsProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get("tab")
  const tab =
    TAB_VALUES.includes(rawTab as never) && (rawTab !== "saved" || profile.isMe)
      ? (rawTab as (typeof TAB_VALUES)[number])
      : "posts"

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setSearchParams(value === "posts" ? {} : { tab: value })}
    >
      <TabsList>
        <TabsTrigger value="posts">Bài đăng</TabsTrigger>
        {profile.isMe && <TabsTrigger value="pinned">Đã ghim</TabsTrigger>}
        {profile.isMe && <TabsTrigger value="saved">Đã lưu</TabsTrigger>}
      </TabsList>

      {TAB_VALUES.map((value) => (
        <TabsContent key={value} value={value} className="mt-4">
          <ProfileTabContent profile={profile} tab={value} />
        </TabsContent>
      ))}
    </Tabs>
  )
}

function ProfileTabContent({
  profile,
  tab,
}: {
  profile: UserProfile
  tab: (typeof TAB_VALUES)[number]
}) {
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
