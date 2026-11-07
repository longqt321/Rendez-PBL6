import { useState } from "react"
import { SparklesIcon, UsersIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePosts } from "../hooks/use-posts"
import type { PostFeedFilter } from "../types/post"
import { PostCard } from "../components/post-card"
import { PostComposer } from "../components/post-composer"

export function SocialPage() {
  const [filter, setFilter] = useState<PostFeedFilter>("all")
  const { data, isPending, isError, refetch } = usePosts(filter)

  const posts = data?.items ?? []

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 lg:px-8 lg:py-8">
      <PostComposer />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as PostFeedFilter)}>
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="unplaced">Chưa gắn địa điểm</TabsTrigger>
            <TabsTrigger value="mine">Của tôi</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isPending ? (
        <p className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Đang tải bài đăng…
        </p>
      ) : isError ? (
        <Empty className="mt-10 border border-dashed border-border">
          <EmptyHeader>
            <EmptyTitle>Không tải được bài đăng</EmptyTitle>
            <EmptyDescription>Kiểm tra kết nối rồi thử lại.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Thử lại
          </Button>
        </Empty>
      ) : posts.length === 0 ? (
        <Empty className="mt-10 border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>Chưa có bài đăng nào</EmptyTitle>
            <EmptyDescription>Mục này chưa có bài. Thử chọn bộ lọc khác.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      )}

      {posts.length > 0 ? (
        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <SparklesIcon className="size-3" aria-hidden="true" />
          Đề xuất địa điểm do hệ thống tạo, bạn xem ở trang Thông báo.
        </p>
      ) : null}
    </div>
  )
}
