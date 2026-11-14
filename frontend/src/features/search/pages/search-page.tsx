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
import { usePosts } from "@/features/social/hooks/use-posts"
import { PostCard } from "@/features/social/components/post-card"
import { useMe } from "@/features/profile/hooks/use-me"
import { formatCount } from "@/lib/format"
import { useUsersSearch } from "../hooks/use-users-search"
import { useUserSuggestions } from "../hooks/use-user-suggestions"
import { UserSuggestionsSection } from "../components/user-suggestions-section"
import { FollowButton } from "../components/follow-button"
import { loginRedirectUrl } from "@/lib/axios"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"

/**
 * Trang tìm kiếm — `/search?q=`.
 *
 * Từ khoá nằm trong URL nên F5, back/forward và link chia sẻ đều giữ kết quả.
 * Ô nhập duy nhất nằm ở topbar (`AppShell`); trang này chỉ đọc `?q=` để tránh hai
 * thanh tìm kiếm cùng lúc. Không có từ khoá → quay về `/discover`.
 *
 * Dùng lại đúng các hook dữ liệu đã có (places/posts/users): server chịu trách
 * nhiệm lọc theo `q`. Tab Người gọi `GET /users?q=` (khớp không dấu).
 */
export function SearchPage() {
  const [params] = useSearchParams()
  const query = (params.get("q") ?? "").trim()

  // Rỗng từ khoá thì không có gì để tìm — trả người dùng về trang Khám phá.
  // Tách component con để không gọi hook có điều kiện (rules-of-hooks).
  if (query.length === 0) return <Navigate to="/discover" replace />

  return <SearchResults query={query} />
}

function SearchResults({ query }: { query: string }) {
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
    fetchNextPage: () => void fetchNextPlaces(),
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
        onSelect={(value) => void navigate(`/search?q=${encodeURIComponent(value)}`)}
      />

      <Tabs defaultValue="places" className="mt-4">
        <TabsList>
          <TabsTrigger value="places">Địa điểm</TabsTrigger>
          <TabsTrigger value="posts">Bài đăng</TabsTrigger>
          <TabsTrigger value="people">Người</TabsTrigger>
        </TabsList>

        <TabsContent value="places" className="mt-4">
          {placesPending ? (
            <ul className="grid grid-cols-2 items-start gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <li key={index}>
                  <PlaceCardSkeleton imageHeight={280 + (index % 3) * 60} />
                </li>
              ))}
            </ul>
          ) : placesError ? (
            <ErrorState
              variant="plain"
              title="Không tải được kết quả địa điểm"
              onRetry={() => void refetchPlaces()}
            />
          ) : places.length === 0 ? (
            <SearchEmptyBlock label="địa điểm" />
          ) : (
            <ul className="grid grid-cols-2 items-start gap-4 md:grid-cols-3">
              {places.map((place) => (
                <li key={place.id}>
                  <PlaceCard place={place} />
                </li>
              ))}
            </ul>
          )}
          {!placesPending && !placesError && places.length > 0 && (
            <>
              <div ref={placesSentinelRef} aria-hidden="true" className="h-px w-full" />
              {placesHasNextPage ? (
                <div className="mt-6 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => void fetchNextPlaces()}
                    disabled={placesFetchingNext}
                  >
                    {placesFetchingNext ? <Spinner aria-label="Đang tải thêm địa điểm" /> : null}
                    {placesFetchingNext ? "Đang tải…" : "Tải thêm"}
                  </Button>
                </div>
              ) : (
                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Đã hiển thị hết kết quả địa điểm.
                </p>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="posts" className="mt-4">
          {postsPending ? (
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-64 w-full rounded-md" />
              ))}
            </div>
          ) : postsError ? (
            <ErrorState
              variant="plain"
              title="Không tải được kết quả bài đăng"
              onRetry={() => void refetchPosts()}
            />
          ) : posts.length === 0 ? (
            <SearchEmptyBlock label="bài đăng" />
          ) : (
            <ul className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
              {posts.map((post) => (
                <li key={post.id}>
                  <PostCard post={post} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="people" className="mt-4">
          {/* Khối gợi ý render độc lập với trạng thái kết quả; tự thu gọn khi guest/rỗng/lỗi. */}
          <UserSuggestionsSection />
          {peoplePending ? (
            <div className="grid max-w-xl grid-cols-1 gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-md" />
              ))}
            </div>
          ) : peopleError ? (
            <ErrorState
              variant="plain"
              title="Không tải được kết quả người dùng"
              onRetry={() => void refetchPeople()}
            />
          ) : people.length === 0 ? (
            <>
              <SearchEmptyBlock label="người dùng" />
              {/* Có gợi ý thì hướng dẫn sang khối bên trên; guest thì mời đăng nhập. */}
              {me && (suggestions?.length ?? 0) > 0 && (
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Không tìm thấy ai tên này — thử những người được gợi ý bên trên.
                </p>
              )}
              {!me && (
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  {/* Guest: mời đăng nhập để xem gợi ý (endpoint cần đăng nhập). */}
                  <Link
                    to={loginRedirectUrl(`${location.pathname}${location.search}`)}
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    Đăng nhập để xem gợi ý theo dõi
                  </Link>
                </p>
              )}
            </>
          ) : (
            <ul
              className="grid max-w-xl grid-cols-1 gap-2"
              aria-label="Kết quả tìm kiếm người dùng"
            >
              {people.map((user) => (
                <li key={user.id}>
                  {/* Item tự là thẻ `<a>` qua `render` nên cần hover riêng (`[a]:hover` chỉ áp cho con). */}
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
                        <UsersIcon
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      ) : (
                        <FollowButton user={user} />
                      )}
                    </ItemActions>
                  </Item>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SearchEmptyBlock({ label }: { label: string }) {
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
