import { Link, Navigate, useLocation, useNavigate } from "react-router"
import { parseNaturalFilterQuery } from "@rendez/schema"
import { CompassIcon, MapIcon } from "lucide-react"
import { parseAsString, useQueryState } from "nuqs"
import { PageContainer, PageHeader } from "@/components/layout/page-primitives"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DidYouMean } from "@/features/places/components/did-you-mean"
import { useDiscoverPlaces } from "@/features/places/hooks/use-discover-places"
import { useMe } from "@/features/profile/hooks/use-me"
import { usePosts } from "@/features/social/hooks/use-posts"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import {
  SearchPeopleTabContent,
  SearchPlacesTabContent,
  SearchPostsTabContent,
} from "../components/search-tab-panels"
import { useUserSuggestions } from "../hooks/use-user-suggestions"
import { useUsersSearch } from "../hooks/use-users-search"

export function SearchPage() {
  const [rawQuery] = useQueryState("q", parseAsString.withDefault(""))
  const query = rawQuery.trim()

  if (query.length === 0) return <Navigate to="/discover" replace />

  return <SearchResults query={query} />
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
  const posts = allPosts
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
