import { useState } from "react"
import { SparklesIcon, UsersIcon } from "lucide-react"
import { ErrorState } from "@/components/shared/error-state"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePosts } from "../hooks/use-posts"
import type { PostFeedFilter } from "../types/post"
import { PostCard } from "../components/post-card"
import { PostComposer } from "../components/post-composer"

export function SocialPage() {
  const [filter, setFilter] = useState<PostFeedFilter>("all")
  const { data, isPending, isError, refetch } = usePosts({ filter })

  const posts = data?.items ?? []

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 lg:px-8 lg:py-8">
      <h1 className="sr-only">Cộng đồng — bài viết về Đà Nẵng</h1>
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
        <div className="mt-4 flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-surface border border-border/20 p-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-48 w-full rounded-surface" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          className="mt-10"
          title="Không tải được bài đăng"
          size="sm"
          onRetry={() => void refetch()}
        />
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
