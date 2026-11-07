import { Link } from "react-router"
import { BookmarkIcon, FolderPlusIcon, MapPinIcon } from "lucide-react"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePosts } from "@/features/social/hooks/use-posts"
import { PostCard } from "@/features/social/components/post-card"
import { useCollections } from "@/features/collections/hooks/use-collection"
import { CollectionCard } from "@/features/collections/components/collection-card"

/**
 * Trang bài đã lưu — `/saved`.
 *
 * Tab "Bài đăng" do server lọc `savedByMe`; tab "Bộ sưu tập" là danh sách bộ
 * sưu tập của người dùng (xem chi tiết tại /collections/:id).
 */
export function SavedPage() {
  const { data: postsData, isPending } = usePosts("all")
  const savedPosts = postsData?.items.filter((post) => post.savedByMe) ?? []
  const { data: collections, isPending: collectionsPending } = useCollections()

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Bài đăng</TabsTrigger>
          <TabsTrigger value="places">Địa điểm</TabsTrigger>
          <TabsTrigger value="collections">Bộ sưu tập</TabsTrigger>
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
                Dùng nút “Lưu vào bộ sưu tập” trên trang địa điểm để lưu. Xem{" "}
                <Link to="/discover" className="underline underline-offset-2">
                  Khám phá
                </Link>{" "}
                để tìm địa điểm mới.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </TabsContent>

        <TabsContent value="collections" className="mt-4">
          {collectionsPending ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              <Spinner /> Đang tải…
            </p>
          ) : collections && collections.length > 0 ? (
            <ul className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection) => (
                <li key={collection.id}>
                  <CollectionCard collection={collection} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty className="mt-2">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FolderPlusIcon />
                </EmptyMedia>
                <EmptyTitle>Chưa có bộ sưu tập nào</EmptyTitle>
                <EmptyDescription>
                  Mở một địa điểm và nhấn “Lưu vào bộ sưu tập” để tạo bộ sưu tập đầu tiên.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
