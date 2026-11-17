import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router"
import { SearchXIcon, UsersIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/shared/error-state"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDiscoverPlaces } from "@/features/places/hooks/use-discover-places"
import { PlaceCard } from "@/features/places/components/place-card"
import { PlaceCardSkeleton } from "@/features/places/components/place-card-skeleton"
import { DidYouMean } from "@/features/places/components/did-you-mean"
import type { Place } from "@/features/places/types/place"
import { usePosts } from "@/features/social/hooks/use-posts"
import { PostCard } from "@/features/social/components/post-card"
import type { Post } from "@/features/social/types/post"
import { useMe } from "@/features/profile/hooks/use-me"
import type { UserProfile } from "@/features/profile/types/profile"
import { formatCount } from "@/lib/format"
import { useUsersSearch } from "../hooks/use-users-search"
import { useUserSuggestions } from "../hooks/use-user-suggestions"
import { UserSuggestionsSection } from "../components/user-suggestions-section"
import { FollowButton } from "../components/follow-button"
import { loginRedirectUrl } from "@/lib/axios"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"

export function SearchPage() {
  const [params] = useSearchParams()
  const query = (params.get("q") ?? "").trim()

  // Rỗng từ khoá thì không có gì để tìm — trả người dùng về trang Khám phá.
  // Tách component con để không gọi hook có điều kiện (rules-of-hooks).
  if (query.length === 0) return <Navigate to="/discover" replace />

  return <SearchResults query={query} />
}

interface SearchPlacesTabContentProps {
  readonly placesPending: boolean
  readonly placesError: boolean
  readonly places: Place[]
  readonly onRetry: () => void
  readonly sentinelRef: React.Ref<HTMLDivElement>
  readonly hasNextPage: boolean
  readonly isFetchingNextPage: boolean
  readonly onFetchNextPage: () => unknown
}

function SearchPlacesTabContent({
  placesPending,
  placesError,
  places,
  onRetry,
  sentinelRef,
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
}: SearchPlacesTabContentProps) {
  if (placesPending) {
    return (
      <ul className="grid grid-cols-2 items-start gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <li key={`skel-sp-${index}`}>
            <PlaceCardSkeleton imageHeight={280 + (index % 3) * 60} />
          </li>
        ))}
      </ul>
    )
  }
  if (placesError) {
    return <ErrorState variant="plain" title="Không tải được kết quả địa điểm" onRetry={onRetry} />
  }
  if (places.length === 0) {
    return <SearchEmptyBlock label="địa điểm" />
  }
  return (
    <>
      <ul className="grid grid-cols-2 items-start gap-4 md:grid-cols-3">
        {places.map((place) => (
          <li key={place.id}>
            <PlaceCard place={place} />
          </li>
        ))}
      </ul>
      <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
      {hasNextPage ? (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={onFetchNextPage} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? <Spinner aria-label="Đang tải thêm địa điểm" /> : null}
            {isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
          </Button>
        </div>
      ) : (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Đã hiển thị hết kết quả địa điểm.
        </p>
      )}
    </>
  )
}

interface SearchPostsTabContentProps {
  readonly postsPending: boolean
  readonly postsError: boolean
  readonly posts: Post[]
  readonly onRetry: () => void
}

function SearchPostsTabContent({
  postsPending,
  postsError,
  posts,
  onRetry,
}: SearchPostsTabContentProps) {
  if (postsPending) {
    return (
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`skel-post-${index}`} className="h-64 w-full rounded-md" />
        ))}
      </div>
    )
  }
  if (postsError) {
    return <ErrorState variant="plain" title="Không tải được kết quả bài đăng" onRetry={onRetry} />
  }
  if (posts.length === 0) {
    return <SearchEmptyBlock label="bài đăng" />
  }
  return (
    <ul className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
      {posts.map((post) => (
        <li key={post.id}>
          <PostCard post={post} />
        </li>
      ))}
    </ul>
  )
}

interface SearchPeopleTabContentProps {
  readonly peoplePending: boolean
  readonly peopleError: boolean
  readonly people: UserProfile[]
  readonly onRetry: () => void
  readonly me: UserProfile | null | undefined
  readonly suggestionsLength: number
  readonly locationString: string
}

function SearchPeopleBody({
  peoplePending,
  peopleError,
  people,
  onRetry,
  me,
  suggestionsLength,
  locationString,
}: SearchPeopleTabContentProps) {
  if (peoplePending) {
    return (
      <div className="grid max-w-xl grid-cols-1 gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={`skel-usr-${index}`} className="h-16 w-full rounded-md" />
        ))}
      </div>
    )
  }
  if (peopleError) {
    return (
      <ErrorState variant="plain" title="Không tải được kết quả người dùng" onRetry={onRetry} />
    )
  }
  if (people.length === 0) {
    return (
      <>
        <SearchEmptyBlock label="người dùng" />
        {me && suggestionsLength > 0 ? (
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Không tìm thấy ai tên này — thử những người được gợi ý bên trên.
          </p>
        ) : null}
        {!me ? (
          <p className="mt-2 text-center text-sm text-muted-foreground">
            <Link
              to={loginRedirectUrl(locationString)}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Đăng nhập để xem gợi ý theo dõi
            </Link>
          </p>
        ) : null}
      </>
    )
  }
  return (
    <ul className="grid max-w-xl grid-cols-1 gap-2" aria-label="Kết quả tìm kiếm người dùng">
      {people.map((user) => (
        <li key={user.id}>
          <Item
            variant="outline"
            className="transition-colors hover:bg-muted"
            render={<Link to={`/u/${user.handle}`} />}
          >
            <ItemMedia>
              <Avatar size="lg">
                {user.avatarUrl && (
                  <AvatarImage src={user.avatarUrl} alt={`Ảnh đại diện của ${user.name}`} />
                )}
                <AvatarFallback className="bg-accent text-sm font-bold text-accent-foreground">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
            </ItemMedia>
            <ItemContent>
              <ItemTitle className="text-sm font-semibold">
                {user.name}
                {me && user.id === me.id ? " (bạn)" : ""}
              </ItemTitle>
              <ItemDescription className="text-xs">
                @{user.handle} · {formatCount(user.postCount)} bài đăng
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              {me && user.id === me.id ? (
                <UsersIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              ) : (
                <FollowButton user={user} />
              )}
            </ItemActions>
          </Item>
        </li>
      ))}
    </ul>
  )
}

function SearchPeopleTabContent(props: SearchPeopleTabContentProps) {
  return (
    <>
      <UserSuggestionsSection />
      <SearchPeopleBody {...props} />
    </>
  )
}

function SearchResults({ query }: Readonly<{ query: string }>) {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    data: placesData,
    isPending: placesPending,
    isError: placesError,
    refetch: refetchPlaces,
    hasNextPage: placesHasNextPage,
    isFetchingNextPage: placesFetchingNext,
    fetchNextPage: fetchNextPlaces,
  } = useDiscoverPlaces({
    category: "all",
    query,
  })
  // Cùng cơ chế cuộn vô hạn với `/discover`: sentinel lọt viewport thì tải trang kế.
  const placesSentinelRef = useInfiniteScroll({
    hasNextPage: placesHasNextPage,
    isFetchingNextPage: placesFetchingNext,
    fetchNextPage: fetchNextPlaces,
  })
  // `q` được lọc server-side (GET /posts?q=); lọc client chỉ giữ bài có gắn địa điểm.
  const {
    posts: allPosts,
    isPending: postsPending,
    isError: postsError,
    refetch: refetchPosts,
  } = usePosts({ filter: "all", q: query })
  const { data: me } = useMe()
  // Tab Người: tìm trên API thật (`GET /users?q=`), không dùng dữ liệu mẫu.
  const {
    data: peopleData,
    isPending: peoplePending,
    isError: peopleError,
    refetch: refetchPeople,
  } = useUsersSearch(query)
  // Dùng lại đúng query của khối gợi ý (cùng key → không gọi thêm request) để
  // biết có gợi ý hay không khi kết quả rỗng.
  const { data: suggestions } = useUserSuggestions()

  const places = placesData?.pages.flatMap((page) => page.items) ?? []
  // `didYouMean` chỉ có ở endpoint tìm kiếm — server so khớp gần đúng (pg_trgm).
  const didYouMean = placesData?.pages[0]?.meta?.didYouMean
  const posts = allPosts.filter((post) => post.placeId !== null)
  const people = peopleData?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <h1 className="sr-only">Kết quả tìm kiếm</h1>
      <p className="text-sm text-muted-foreground">
        Kết quả cho <span className="font-semibold text-foreground">“{query}”</span>
      </p>

      <DidYouMean
        suggestion={didYouMean}
        onSelect={(value) => {
          void navigate(`/search?q=${encodeURIComponent(value)}`)
        }}
      />

      <Tabs defaultValue="places" className="mt-4">
        <TabsList>
          <TabsTrigger value="places">Địa điểm</TabsTrigger>
          <TabsTrigger value="posts">Bài đăng</TabsTrigger>
          <TabsTrigger value="people">Người</TabsTrigger>
        </TabsList>

        <TabsContent value="places" className="mt-4">
          <SearchPlacesTabContent
            placesPending={placesPending}
            placesError={placesError}
            places={places}
            onRetry={() => {
              refetchPlaces().catch(() => {})
            }}
            sentinelRef={placesSentinelRef}
            hasNextPage={placesHasNextPage}
            isFetchingNextPage={placesFetchingNext}
            onFetchNextPage={fetchNextPlaces}
          />
        </TabsContent>

        <TabsContent value="posts" className="mt-4">
          <SearchPostsTabContent
            postsPending={postsPending}
            postsError={postsError}
            posts={posts}
            onRetry={() => {
              refetchPosts().catch(() => {})
            }}
          />
        </TabsContent>

        <TabsContent value="people" className="mt-4">
          <SearchPeopleTabContent
            peoplePending={peoplePending}
            peopleError={peopleError}
            people={people}
            onRetry={() => {
              refetchPeople().catch(() => {})
            }}
            me={me}
            suggestionsLength={suggestions?.length ?? 0}
            locationString={`${location.pathname}${location.search}`}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SearchEmptyBlock({ label }: Readonly<{ label: string }>) {
  return (
    <Empty className="mt-2">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>Không có {label} phù hợp</EmptyTitle>
        <EmptyDescription>Thử từ khoá khác hoặc ngắn hơn.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
