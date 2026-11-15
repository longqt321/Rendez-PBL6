import { Link } from "react-router"
import { BookmarkIcon, FolderPlusIcon, MapPinIcon } from "lucide-react"
import { ErrorState } from "@/components/shared/error-state"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useSavedPlaces } from "../hooks/use-saved-places"
import { PlaceCard } from "@/features/places/components/place-card"
import { usePosts } from "@/features/social/hooks/use-posts"
import { PostCard } from "@/features/social/components/post-card"
import { useCollections } from "@/features/collections/hooks/use-collection"
import { CollectionCard } from "@/features/collections/components/collection-card"

export function SavedPage() {
  const {
    posts: savedPosts,
    isPending,
    isError: postsError,
    refetch: refetchPosts,
  } = usePosts({ filter: "saved" })
  const {
    data: collections,
    isPending: collectionsPending,
    isError: collectionsError,
    refetch: refetchCollections,
  } = useCollections()
  const {
    places: savedPlaces,
    isPending: savedPlacesPending,
    isError: savedPlacesError,
    refetch: refetchSavedPlaces,
    hasNextPage: savedPlacesHasNextPage,
    isFetchingNextPage: savedPlacesFetchingNextPage,
    fetchNextPage: fetchNextSavedPlaces,
  } = useSavedPlaces()

  const savedPlacesSentinelRef = useInfiniteScroll({
    hasNextPage: savedPlacesHasNextPage,
    isFetchingNextPage: savedPlacesFetchingNextPage,
    fetchNextPage: () => void fetchNextSavedPlaces(),
  })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <h1 className="sr-only">Đã lưu</h1>
      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Bài đăng</TabsTrigger>
          <TabsTrigger value="places">Địa điểm</TabsTrigger>
          <TabsTrigger value="collections">Bộ sưu tập</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          {isPending ? (
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-64 w-full rounded-md" />
              ))}
            </div>
          ) : postsError ? (
            <ErrorState
              variant="plain"
              title="Không tải được bài đã lưu"
              onRetry={() => void refetchPosts()}
            />
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
          {savedPlacesPending ? (
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-64 w-full rounded-md" />
              ))}
            </div>
          ) : savedPlacesError ? (
            <ErrorState
              variant="plain"
              title="Không tải được địa điểm đã lưu"
              onRetry={() => void refetchSavedPlaces()}
            />
          ) : savedPlaces.length > 0 ? (
            <>
              <ul className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {savedPlaces.map((place) => (
                  <li key={place.id}>
                    <PlaceCard place={place} />
                  </li>
                ))}
              </ul>
              <div ref={savedPlacesSentinelRef} aria-hidden="true" className="h-px w-full" />
              {savedPlacesHasNextPage ? (
                <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Spinner aria-label="Đang tải thêm địa điểm" className="size-3" />
                  Đang tải thêm địa điểm…
                </p>
              ) : null}
            </>
          ) : (
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
          )}
        </TabsContent>

        <TabsContent value="collections" className="mt-4">
          {collectionsPending ? (
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-40 w-full rounded-md" />
              ))}
            </div>
          ) : collectionsError ? (
            <ErrorState
              variant="plain"
              title="Không tải được bộ sưu tập"
              onRetry={() => void refetchCollections()}
            />
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
