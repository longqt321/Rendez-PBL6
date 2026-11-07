import { Link } from "react-router"
import { BookmarkIcon, MapPinIcon } from "lucide-react"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePosts } from "@/features/social/hooks/use-posts"
import { PostCard } from "@/features/social/components/post-card"

/**
 * Trang bài đã lưu — `/saved`.
 *
 * Server lọc bài `savedByMe`; client chỉ render. Địa điểm đã lưu chưa có
 * endpoint nên tab đó hiện empty state thật.
 */
export function SavedPage() {
  const { data: postsData, isPending } = usePosts("all")
  const savedPosts = postsData?.items.filter((post) => post.savedByMe) ?? []

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Bài đăng</TabsTrigger>
          <TabsTrigger value="places">Địa điểm</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          {isPending ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Đang tải…</p>
          ) : savedPosts.length === 0 ? (
            <Empty className="mt-2">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookmarkIcon />
                </EmptyMedia>
                <EmptyTitle>Chưa lưu bài nào</EmptyTitle>
                <EmptyDescription>
                  Nhấn biểu tượng Lưu trên bài đăng để thấy nó ở đây.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
              {savedPosts.map((post) => (
                <li key={post.id}>
                  <PostCard post={post} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="places" className="mt-4">
          <Empty className="mt-2">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MapPinIcon />
              </EmptyMedia>
              <EmptyTitle>Chưa lưu địa điểm nào</EmptyTitle>
              <EmptyDescription>
                Tính năng lưu địa điểm đang được phát triển. Xem{" "}
                <Link to="/discover" className="underline underline-offset-2">
                  Khám phá
                </Link>{" "}
                để tìm địa điểm mới.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </TabsContent>
      </Tabs>
    </div>
  )
}
