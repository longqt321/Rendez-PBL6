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
import type { Place } from "@/features/places/types/place"
import { usePosts } from "@/features/social/hooks/use-posts"
import { PostCard } from "@/features/social/components/post-card"
import type { Post } from "@/features/social/types/post"
import { useCollections } from "@/features/collections/hooks/use-collection"
import { CollectionCard } from "@/features/collections/components/collection-card"
import type { CollectionSummary } from "@/features/collections/types/collection"

interface SavedPostsContentProps {
  readonly isPending: boolean
  readonly postsError: boolean
  readonly savedPosts: Post[]
  readonly onRetry: () => void
}

function SavedPostsContent({ isPending, postsError, savedPosts, onRetry }: SavedPostsContentProps) {
  if (isPending) {
    return (
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`skel-post-${index}`} className="h-64 w-full rounded-md" />
        ))}
      </div>
    )
  }
  if (postsError) {
    return <ErrorState variant="plain" title="Không tải được bài đã lưu" onRetry={onRetry} />
  }
  if (savedPosts.length === 0) {
    return (
      <Empty className="mt-2">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookmarkIcon />
          </EmptyMedia>
          <EmptyTitle>Chưa lưu bài nào</EmptyTitle>
          <EmptyDescription>Nhấn biểu tượng Lưu trên bài đăng để thấy nó ở đây.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <ul className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
      {savedPosts.map((post) => (
        <li key={post.id}>
          <PostCard post={post} />
        </li>
      ))}
    </ul>
  )
}

interface SavedPlacesContentProps {
  readonly savedPlacesPending: boolean
  readonly savedPlacesError: boolean
  readonly savedPlaces: Place[]
  readonly onRetry: () => void
  readonly sentinelRef: React.Ref<HTMLDivElement>
  readonly hasNextPage: boolean
}

function SavedPlacesContent({
  savedPlacesPending,
  savedPlacesError,
  savedPlaces,
  onRetry,
  sentinelRef,
  hasNextPage,
}: SavedPlacesContentProps) {
  if (savedPlacesPending) {
    return (
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={`skel-place-${index}`} className="h-64 w-full rounded-md" />
        ))}
      </div>
    )
  }
  if (savedPlacesError) {
    return <ErrorState variant="plain" title="Không tải được địa điểm đã lưu" onRetry={onRetry} />
  }
  if (savedPlaces.length === 0) {
    return (
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
    )
  }
  return (
    <>
      <ul className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {savedPlaces.map((place) => (
          <li key={place.id}>
            <PlaceCard place={place} />
          </li>
        ))}
      </ul>
      <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
      {hasNextPage ? (
        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Spinner aria-label="Đang tải thêm địa điểm" className="size-3" />
          Đang tải thêm địa điểm…
        </p>
      ) : null}
    </>
  )
}

interface SavedCollectionsContentProps {
  readonly collectionsPending: boolean
  readonly collectionsError: boolean
  readonly collections?: CollectionSummary[]
  readonly onRetry: () => void
}

function SavedCollectionsContent({
  collectionsPending,
  collectionsError,
  collections,
  onRetry,
}: SavedCollectionsContentProps) {
  if (collectionsPending) {
    return (
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={`skel-col-${index}`} className="h-40 w-full rounded-md" />
        ))}
      </div>
    )
  }
  if (collectionsError) {
    return <ErrorState variant="plain" title="Không tải được bộ sưu tập" onRetry={onRetry} />
  }
  if (!collections || collections.length === 0) {
    return (
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
    )
  }
  return (
    <ul className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {collections.map((collection) => (
        <li key={collection.id}>
          <CollectionCard collection={collection} />
        </li>
      ))}
    </ul>
  )
}

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
    fetchNextPage: fetchNextSavedPlaces,
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
          <SavedPostsContent
            isPending={isPending}
            postsError={postsError}
            savedPosts={savedPosts}
            onRetry={() => {
              refetchPosts().catch(() => {})
            }}
          />
        </TabsContent>

        <TabsContent value="places" className="mt-4">
          <SavedPlacesContent
            savedPlacesPending={savedPlacesPending}
            savedPlacesError={savedPlacesError}
            savedPlaces={savedPlaces}
            onRetry={() => {
              refetchSavedPlaces().catch(() => {})
            }}
            sentinelRef={savedPlacesSentinelRef}
            hasNextPage={savedPlacesHasNextPage}
          />
        </TabsContent>

        <TabsContent value="collections" className="mt-4">
          <SavedCollectionsContent
            collectionsPending={collectionsPending}
            collectionsError={collectionsError}
            collections={collections}
            onRetry={() => {
              refetchCollections().catch(() => {})
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
