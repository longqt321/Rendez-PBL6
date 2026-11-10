import { Link, Navigate, useSearchParams } from "react-router"
import { SearchXIcon, UsersIcon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { usePosts } from "@/features/social/hooks/use-posts"
import { PostCard } from "@/features/social/components/post-card"
import { useMe } from "@/features/profile/hooks/use-me"
import { formatCount } from "@/lib/format"
import { MOCK_USERS } from "@/mocks/fixtures/users"

/**
 * Trang tìm kiếm — `/search?q=`.
 *
 * Từ khoá nằm trong URL nên F5, back/forward và link chia sẻ đều giữ kết quả.
 * Ô nhập duy nhất nằm ở topbar (`AppShell`); trang này chỉ đọc `?q=` để tránh hai
 * thanh tìm kiếm cùng lúc. Không có từ khoá → quay về `/discover`.
 *
 * Dùng lại đúng các hook dữ liệu đã có (places/posts): server chịu trách nhiệm
 * lọc theo `q`. Tab Người lọc trên danh sách hồ sơ mock, chưa có endpoint.
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
  const {
    data: placesData,
    isPending: placesPending,
    isError: placesError,
    refetch: refetchPlaces,
  } = useDiscoverPlaces({
    category: "all",
    query,
  })
  // `q` được lọc server-side (GET /posts?q=); lọc client chỉ giữ bài có gắn địa điểm.
  const {
    posts: allPosts,
    isPending: postsPending,
    isError: postsError,
    refetch: refetchPosts,
  } = usePosts({ filter: "all", q: query })
  const { data: me } = useMe()

  const places = placesData?.pages.flatMap((page) => page.items) ?? []
  const posts = allPosts.filter((post) => post.placeId !== null)
  const people = Object.values(MOCK_USERS).filter((user) =>
    `${user.name} ${user.handle}`.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <h1 className="sr-only">Kết quả tìm kiếm</h1>
      <p className="text-sm text-muted-foreground">
        Kết quả cho <span className="font-semibold text-foreground">“{query}”</span>
      </p>

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
          {people.length === 0 ? (
            <SearchEmptyBlock label="người dùng" />
          ) : (
            <ul className="grid max-w-xl grid-cols-1 gap-2">
              {people.map((user) => (
                <li key={user.id}>
                  {/* Item tự là thẻ `<a>` qua `render` nên cần hover riêng (`[a]:hover` chỉ áp cho con). */}
                  <Item
                    variant="outline"
                    className="transition-colors hover:bg-muted"
                    render={<Link to={user.isMe ? "/profile" : `/u/${user.handle}`} />}
                  >
                    <ItemMedia>
                      <Avatar size="lg">
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
                      <UsersIcon
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
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
