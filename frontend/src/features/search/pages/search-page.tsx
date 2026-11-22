import { Link, Navigate, useLocation, useNavigate } from "react-router"
import { parseAsString, useQueryState } from "nuqs"
import { parseNaturalFilterQuery } from "@rendez/schema"
import { CompassIcon, MapIcon, SearchXIcon, SparklesIcon, UsersIcon } from "lucide-react"
import { PageContainer, PageHeader } from "@/components/layout/page-primitives"
import { ErrorState } from "@/components/shared/error-state"
import { LoadMore } from "@/components/shared/load-more"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { DidYouMean } from "@/features/places/components/did-you-mean"
import { PlaceCard } from "@/features/places/components/place-card"
import { PlaceCardSkeleton } from "@/features/places/components/place-card-skeleton"
import { useDiscoverPlaces } from "@/features/places/hooks/use-discover-places"
import type { Place } from "@/features/places/types/place"
import { useMe } from "@/features/profile/hooks/use-me"
import type { UserProfile } from "@/features/profile/types/profile"
import { PostCard } from "@/features/social/components/post-card"
import { usePosts } from "@/features/social/hooks/use-posts"
import type { Post } from "@/features/social/types/post"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { loginRedirectUrl } from "@/lib/axios"
import { formatCount } from "@/lib/format"
import { FollowButton } from "../components/follow-button"
import { UserSuggestionsSection } from "../components/user-suggestions-section"
import { useUserSuggestions } from "../hooks/use-user-suggestions"
import { useUsersSearch } from "../hooks/use-users-search"

const DANANG_SEARCH_SUGGESTIONS = [
  "Mì Quảng",
  "Bánh xèo",
  "Bún chả cá",
  "Hải sản",
  "Cà phê",
] as const

export function SearchPage() {
  const [rawQuery] = useQueryState("q", parseAsString.withDefault(""))
  const query = rawQuery.trim()

  if (query.length === 0) return <Navigate to="/discover" replace />

  return <SearchResults query={query} />
}

interface SearchPaginationFooterProps {
  readonly sentinelRef: React.Ref<HTMLDivElement>
  readonly hasNextPage: boolean
  readonly isFetchingNextPage: boolean
  readonly onFetchNextPage: () => unknown
  readonly label: string
}

function SearchPaginationFooter({
  sentinelRef,
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
  label,
}: SearchPaginationFooterProps) {
  return (
    <LoadMore
      sentinelRef={sentinelRef}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={onFetchNextPage}
      loadingLabel={`Đang tải thêm ${label}`}
      endMessage={`Đã hiển thị hết kết quả ${label}.`}
    />
  )
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
      <ul className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <li key={`skel-sp-${index}`}>
            <PlaceCardSkeleton imageHeight={240} />
          </li>
        ))}
      </ul>
    )
  }
  if (placesError) {
    return <ErrorState variant="plain" title="Không tải được kết quả địa điểm" onRetry={onRetry} />
  }
  if (places.length === 0) {
    return <SearchEmptyBlock label="địa điểm" showSuggestions />
  }
  return (
    <>
      <ul className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {places.map((place) => (
          <li key={place.id}>
            <PlaceCard place={place} />
          </li>
        ))}
      </ul>
      <SearchPaginationFooter
        sentinelRef={sentinelRef}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onFetchNextPage={onFetchNextPage}
        label="địa điểm"
      />
    </>
  )
}

interface SearchPostsTabContentProps {
  readonly postsPending: boolean
  readonly postsError: boolean
  readonly posts: Post[]
  readonly onRetry: () => void
  readonly sentinelRef: React.Ref<HTMLDivElement>
  readonly hasNextPage: boolean
  readonly isFetchingNextPage: boolean
  readonly onFetchNextPage: () => unknown
}

function SearchPostsTabContent({
  postsPending,
  postsError,
  posts,
  onRetry,
  sentinelRef,
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
}: SearchPostsTabContentProps) {
  if (postsPending) {
    return (
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`skel-post-${index}`} className="h-64 w-full rounded-surface" />
        ))}
      </div>
    )
  }
  if (postsError) {
    return <ErrorState variant="plain" title="Không tải được kết quả bài đăng" onRetry={onRetry} />
  }
  if (posts.length === 0 && !hasNextPage) {
    return <SearchEmptyBlock label="bài đăng" />
  }
  return (
    <>
      {posts.length > 0 ? (
        <ul className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      ) : null}
      <SearchPaginationFooter
        sentinelRef={sentinelRef}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onFetchNextPage={onFetchNextPage}
        label="bài đăng"
      />
    </>
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
  readonly sentinelRef: React.Ref<HTMLDivElement>
  readonly hasNextPage: boolean
  readonly isFetchingNextPage: boolean
  readonly onFetchNextPage: () => unknown
}

function SearchPeopleBody({
  peoplePending,
  peopleError,
  people,
  onRetry,
  me,
  suggestionsLength,
  locationString,
  sentinelRef,
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
}: SearchPeopleTabContentProps) {
  if (peoplePending) {
    return (
      <div className="grid max-w-xl grid-cols-1 gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={`skel-usr-${index}`} className="h-16 w-full rounded-surface" />
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
            Không tìm thấy ai tên này. Bạn có thể xem những người được gợi ý ở trên.
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
    <>
      <ul className="grid max-w-xl grid-cols-1 gap-2" aria-label="Kết quả tìm kiếm người dùng">
        {people.map((user) => (
          <li key={user.id}>
            <Item
              variant="outline"
              className="rounded-surface bg-card transition-colors hover:bg-muted"
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
      <SearchPaginationFooter
        sentinelRef={sentinelRef}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onFetchNextPage={onFetchNextPage}
        label="người dùng"
      />
    </>
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
  const placesSentinelRef = useInfiniteScroll({
    hasNextPage: placesHasNextPage,
    isFetchingNextPage: placesFetchingNext,
    fetchNextPage: fetchNextPlaces,
  })

  const {
    posts: allPosts,
    isPending: postsPending,
    isError: postsError,
    refetch: refetchPosts,
    hasNextPage: postsHasNextPage,
    isFetchingNextPage: postsFetchingNext,
    fetchNextPage: fetchNextPosts,
  } = usePosts({ filter: "all", q: query })
  const postsSentinelRef = useInfiniteScroll({
    hasNextPage: postsHasNextPage,
    isFetchingNextPage: postsFetchingNext,
    fetchNextPage: fetchNextPosts,
  })
  const { data: me } = useMe()
  const {
    data: peopleData,
    isPending: peoplePending,
    isError: peopleError,
    refetch: refetchPeople,
    hasNextPage: peopleHasNextPage,
    isFetchingNextPage: peopleFetchingNext,
    fetchNextPage: fetchNextPeople,
  } = useUsersSearch(query)
  const peopleSentinelRef = useInfiniteScroll({
    hasNextPage: peopleHasNextPage,
    isFetchingNextPage: peopleFetchingNext,
    fetchNextPage: fetchNextPeople,
  })
  const { data: suggestions } = useUserSuggestions()

  const parsedQuery = parseNaturalFilterQuery(query)
  const places = placesData?.pages.flatMap((page) => page.items) ?? []
  const didYouMean = placesData?.pages[0]?.meta?.didYouMean
  const posts = allPosts.filter((post) => post.placeId !== null)
  const people = peopleData?.pages.flatMap((page) => page.items) ?? []

  return (
    <PageContainer size="wide">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={`Kết quả cho “${query}”`} />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            render={<Link to={`/discover?q=${encodeURIComponent(query)}`} />}
          >
            <CompassIcon className="size-3.5 text-primary" aria-hidden="true" />
            Mở trong Khám phá
          </Button>
          <Button
            size="sm"
            variant="outline"
            render={<Link to={`/map?q=${encodeURIComponent(query)}`} />}
          >
            <MapIcon className="size-3.5 text-primary" aria-hidden="true" />
            Xem trên Bản đồ
          </Button>
        </div>
      </div>

      {parsedQuery.chips.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Đã áp dụng lọc tự động:</span>
          {parsedQuery.chips.map((chip) => (
            <Badge
              key={chip.id}
              variant="outline"
              className={
                chip.kind === "exclude"
                  ? "border-destructive/40 bg-destructive/10 text-xs text-destructive"
                  : "border-primary/40 bg-primary/10 text-xs text-primary"
              }
            >
              {chip.label}
            </Badge>
          ))}
        </div>
      ) : null}

      <DidYouMean
        suggestion={didYouMean}
        onSelect={(value) => {
          void navigate(`/search?q=${encodeURIComponent(value)}`)
        }}
      />

      <Tabs defaultValue="places" className="mt-4">
        <TabsList>
          <TabsTrigger value="places" className="gap-1.5">
            Địa điểm
            <Badge variant="secondary" className="px-1.5 py-0 text-xs tabular-nums">
              {places.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="posts" className="gap-1.5">
            Bài đăng
            <Badge variant="secondary" className="px-1.5 py-0 text-xs tabular-nums">
              {posts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="people" className="gap-1.5">
            Người
            <Badge variant="secondary" className="px-1.5 py-0 text-xs tabular-nums">
              {people.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="places" className="mt-5">
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

        <TabsContent value="posts" className="mt-5">
          <SearchPostsTabContent
            postsPending={postsPending}
            postsError={postsError}
            posts={posts}
            onRetry={() => {
              refetchPosts().catch(() => {})
            }}
            sentinelRef={postsSentinelRef}
            hasNextPage={postsHasNextPage}
            isFetchingNextPage={postsFetchingNext}
            onFetchNextPage={fetchNextPosts}
          />
        </TabsContent>

        <TabsContent value="people" className="mt-5">
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
            sentinelRef={peopleSentinelRef}
            hasNextPage={peopleHasNextPage}
            isFetchingNextPage={peopleFetchingNext}
            onFetchNextPage={fetchNextPeople}
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}

function SearchEmptyBlock({
  label,
  showSuggestions = false,
}: Readonly<{ label: string; showSuggestions?: boolean }>) {
  return (
    <Empty className="mt-4 border border-dashed border-border bg-card/50 py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>Không có {label} phù hợp</EmptyTitle>
        <EmptyDescription>Thử từ khoá khác hoặc ngắn hơn.</EmptyDescription>
      </EmptyHeader>
      {showSuggestions ? (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {DANANG_SEARCH_SUGGESTIONS.map((term) => (
            <Button
              key={term}
              size="sm"
              variant="outline"
              className="rounded-full text-xs"
              render={<Link to={`/search?q=${encodeURIComponent(term)}`} />}
            >
              <SparklesIcon className="size-3.5 text-primary" aria-hidden="true" />
              {term}
            </Button>
          ))}
        </div>
      ) : null}
    </Empty>
  )
}
