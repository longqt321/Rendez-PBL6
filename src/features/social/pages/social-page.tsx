import { useState } from "react"
import { SparklesIcon, UsersIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAppStore } from "@/stores/app-store"
import { PostCard } from "../components/post-card"
import { PostComposer } from "../components/post-composer"

type FeedFilter = "all" | "unplaced" | "mine"

export function SocialPage() {
  const [filter, setFilter] = useState<FeedFilter>("all")
  const posts = useAppStore((state) => state.posts)
  const runPlaceDetection = useAppStore((state) => state.runPlaceDetection)

  const visible = posts.filter((post) => {
    if (filter === "unplaced") return post.placeId === null
    if (filter === "mine") return post.author.id === "u-me"
    return true
  })

  const unplacedCount = posts.filter((post) => post.placeId === null).length

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tight">
          <UsersIcon className="size-6" aria-hidden="true" />
          Cộng đồng
        </h1>
        <p className="text-sm text-muted-foreground">
          Nơi mọi người chia sẻ bữa ăn. Bài đăng ở đây độc lập với danh sách Khám phá.
        </p>
      </header>

      <div className="mt-5">
        <PostComposer />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as FeedFilter)}>
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="unplaced">Chưa gắn địa điểm</TabsTrigger>
            <TabsTrigger value="mine">Của tôi</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          variant="outline"
          size="sm"
          onClick={runPlaceDetection}
          disabled={unplacedCount === 0}
          title="Mô phỏng thuật toán quét bài chưa gắn địa điểm"
        >
          <SparklesIcon />
          Chạy gợi ý địa điểm
        </Button>
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Chưa có bài đăng nào trong mục này.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {visible.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
